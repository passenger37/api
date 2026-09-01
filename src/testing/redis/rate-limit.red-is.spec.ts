/**
 * Lecture 40.88 �?" Redis Integration Tests: Rate Limit.
 *
 * The rate-limiters are INCR + conditional EXPIRE windows over Redis. These
 * specs run the real `WebSocketRateLimitService`/`AuthRateLimitService`
 * against a live Redis to confirm the counting/expiry and the 429 past the
 * configured limit.
 */

import { HttpException } from '@nestjs/common';

import { AuthRateLimitService } from '../../modules/auth/services/auth-rate-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { createRedisTestHarness, RedisTestHarness } from './redis-test.harness';

describe('Redis Integration: Rate Limit', () => {
  let harness: RedisTestHarness;

  beforeAll(async () => {
    harness = await createRedisTestHarness();
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('allows requests within the window, then throttles past the limit (websocket)', async () => {
    const service = new WebSocketRateLimitService(harness.redis);
    const key = `it:ws-rate:${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      await expect(
        service.consume({ key, limit: 3, windowSeconds: 60 }),
      ).resolves.toBeUndefined();
    }

    await expect(
      service.consume({ key, limit: 3, windowSeconds: 60 }),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.consume({ key, limit: 3, windowSeconds: 60 }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('resets a fresh window after the TTL expires', async () => {
    const service = new WebSocketRateLimitService(harness.redis);
    const key = `it:ws-rate-exp:${Date.now()}`;
    const windowSeconds = 1;

    for (let i = 0; i < 2; i++) {
      await service.consume({ key, limit: 2, windowSeconds });
    }
    await expect(
      service.consume({ key, limit: 2, windowSeconds }),
    ).rejects.toMatchObject({ status: 429 });

    await new Promise((r) => setTimeout(r, 1100));

    await expect(
      service.consume({ key, limit: 2, windowSeconds }),
    ).resolves.toBeUndefined();
  });

  it('throttles repeated authentication attempts (auth rate-limit)', async () => {
    const service = new AuthRateLimitService(harness.redis);
    const key = `it:auth-rate:${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      await service.consume({ key, limit: 5, windowSeconds: 60 });
    }

    await expect(
      service.consume({ key, limit: 5, windowSeconds: 60 }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('keeps independent counters per key, not a global window', async () => {
    const service = new WebSocketRateLimitService(harness.redis);
    const keyA = `it:ws-rate:a:${Date.now()}`;
    const keyB = `it:ws-rate:b:${Date.now()}`;

    for (let i = 0; i < 2; i++) {
      await service.consume({ key: keyA, limit: 2, windowSeconds: 60 });
    }
    await expect(
      service.consume({ key: keyA, limit: 2, windowSeconds: 60 }),
    ).rejects.toMatchObject({ status: 429 });

    await expect(
      service.consume({ key: keyB, limit: 2, windowSeconds: 60 }),
    ).resolves.toBeUndefined();
  });
});
