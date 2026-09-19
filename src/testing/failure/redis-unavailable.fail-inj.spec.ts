/**
 * Lecture 40.90 - Failure Injection Testing: Redis unavailable / network
 * interruption.
 *
 * Proves the app's degradation contract when Redis is down. No live Redis is
 * needed: a real `RedisService` is pointed at a closed port.
 *
 *  - Startup: booting fails fast (`onModuleInit` rejects) instead of
 *    half-booting into a broken state.
 *  - Runtime: commands fail loud (reject) - they never silently succeed, never
 *    hang the caller forever.
 *  - Coordination: lock operations propagate the outage (no partial success).
 *  - Advisory registry: the node registry is designed to degrade - explicit
 *    reads surface the outage, while shutdown swallows it.
 *  - Surfaces: the outage maps to the stable degradation frames - HTTP
 *    500 `{ success:false }` via `GlobalExceptionFilter`, WS `INTERNAL_ERROR`
 *    via `WebSocketErrorNormalizer`.
 *
 * node-redis v6 keeps an infinite reconnect loop after a failed connect, so
 * every failed `onModuleInit` is followed by destroying the client. That both
 * halts the retry (jest would otherwise never exit) and leaves the service in
 * the "closed client" state the runtime paths must handle.
 */
import { ArgumentsHost } from '@nestjs/common';

import { GlobalExceptionFilter } from '../../common/exceptions/filters/global-exception.filter';
import { WebSocketErrorCode } from '../../common/websocket/error/websocket-error-code.enum';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
import { StructuredLogger } from '../../core/logger/structured-logger';
import { RedisLockService } from '../../core/redis/redis-lock.service';
import { RedisNodeRegistry } from '../../core/redis/redis-node-registry';
import { RedisService } from '../../core/redis/redis.service';

const UNREACHABLE_REDIS_URL = 'redis://127.0.0.1:1';

async function newDeadRedis(): Promise<RedisService> {
  process.env.REDIS_URL = UNREACHABLE_REDIS_URL;
  return new RedisService();
}

async function destroyRedis(redis: RedisService): Promise<void> {
  // Halt node-redis's auto-retry loop and silence its error listener before
  // asserting on the closed-client runtime behavior, otherwise it reconnects
  // forever and jest never exits. After the bounded strategy gives up the
  // client reports itself as closed and `destroy()` throws - that is fine.
  const client = redis.getClient();
  client.removeAllListeners('error');
  try {
    client.destroy();
  } catch {
    // Already closed after the bounded initial connect gave up.
  }
}

async function bootDeadRedis(): Promise<RedisService> {
  const redis = await newDeadRedis();
  await redis.onModuleInit().catch(() => undefined);
  await destroyRedis(redis);
  return redis;
}

describe('Failure Injection: Redis unavailable (40.90)', () => {
  const services: RedisService[] = [];

  afterEach(async () => {
    for (const redis of services.splice(0)) {
      const client = redis.getClient();
      client.removeAllListeners('error');
      try {
        client.destroy();
      } catch {
        // Already closed after the bounded initial connect gave up.
      }
    }
    delete process.env.REDIS_URL;
  });

  it('fails fast at boot when Redis is unreachable', async () => {
    const redis = await newDeadRedis();
    services.push(redis);

    await expect(redis.onModuleInit()).rejects.toThrow('ECONNREFUSED');
    await destroyRedis(redis);

    // Startup rejected before the client was handed out; callers still see a
    // concrete (closed) client rather than a null dereference.
    expect(redis.getClient()).toBeDefined();
  });

  it('runtime commands fail loud while Redis is unavailable', async () => {
    const redis = await bootDeadRedis();
    services.push(redis);

    await expect(redis.get('missing')).rejects.toThrow();
    await expect(redis.set('k', 'v')).rejects.toThrow();
  });

  it('lock coordination propagates the outage (no silent partial success)', async () => {
    const redis = await bootDeadRedis();
    services.push(redis);

    const lock = new RedisLockService(redis);
    await expect(
      lock.runExclusive('lock:typo', 1000, async () => 'ran'),
    ).rejects.toThrow();
  });

  it('node registry fails loud on reads but degrades gracefully on shutdown', async () => {
    const redis = await bootDeadRedis();
    services.push(redis);

    const registry = new RedisNodeRegistry(redis);
    await expect(registry.register()).rejects.toThrow();
    await expect(registry.listInstances()).rejects.toThrow();

    // Shutdown must not throw even though the registry writes are failing.
    await expect(registry.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('maps a Redis outage to the WS INTERNAL_ERROR degradation frame', () => {
    const normalizer = new WebSocketErrorNormalizer();

    const frame = normalizer.normalize(
      new Error('The client is closed'),
      'send-message',
    );

    expect(frame).toEqual({
      success: false,
      event: 'send-message',
      error: {
        code: WebSocketErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      },
    });
  });

  it('maps a Redis outage to the HTTP 500 degradation frame', () => {
    const response: { status: jest.Mock; json: jest.Mock } = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      method: 'GET',
      url: '/servers/s/channels/c/messages',
      id: undefined,
      user: undefined,
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    const filter = new GlobalExceptionFilter({
      error: () => undefined,
    } as unknown as StructuredLogger);

    filter.catch(new Error('The client is closed'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal Server Error',
      }),
    );
  });
});
