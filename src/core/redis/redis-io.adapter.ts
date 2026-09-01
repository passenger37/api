import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { ServerOptions } from 'socket.io';

import { resolveRedisUrl } from './redis.service';
import { redisKeys } from './redis-keys';
import { resolveNodeId } from './redis-node-registry';

export type RedisIoClientRole = 'pub' | 'sub';

/** Deterministic, per-instance client name for CLIENT LIST visibility during scale-out. */
export function redisIoClientName(role: RedisIoClientRole, nodeId: string): string {
  return `socket.io:${role}:${nodeId}`;
}

/**
 * Lecture 40.81 — Multi-instance WebSocket support (full horizontal scaling).
 *
 * Thin refinement over the 40.61 Redis adapter: the pub/sub clients are given
 * per-instance names (so `CLIENT LIST` reveals which node owns which socket.io
 * shard), the adapter identifies itself with the node id, and `disconnect()`
 * cleanly closes the duplicated clients on shutdown instead of leaking them.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private readonly nodeId: string;

  constructor(httpServer?: unknown) {
    super(httpServer as object);
    this.nodeId = resolveNodeId();
  }

  instanceId(): string {
    return this.nodeId;
  }

  async connectToRedis(): Promise<void> {
    const pubClient: RedisClientType = createClient({
      url: resolveRedisUrl(),
      name: redisIoClientName('pub', this.nodeId),
    });

    const subClient = pubClient.duplicate({
      name: redisIoClientName('sub', this.nodeId),
    });

    pubClient.on('error', (err) => {
      console.error('Redis Socket.IO adapter pub error', err);
    });

    subClient.on('error', (err) => {
      console.error('Redis Socket.IO adapter sub error', err);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.pubClient = pubClient;
    this.subClient = subClient;

    this.adapterConstructor = createAdapter(pubClient, subClient, {
      key: redisKeys.socketIoAdapter(),
    });
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  /** Gracefully close the adapter's pub/sub connections (avoids leaked clients). */
  async disconnect(): Promise<void> {
    const clients = [this.pubClient, this.subClient].filter(
      (c): c is RedisClientType => c !== null,
    );
    this.pubClient = null;
    this.subClient = null;
    await Promise.all(clients.map((c) => c.quit().catch(() => undefined)));
  }
}
