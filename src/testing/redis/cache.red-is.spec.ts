/**
 * Lecture 40.88 �?" Redis Integration Tests: Cache.
 *
 * Exercises the real `DbCacheService` (cache-aside over Redis) with a real
 * `MetricsService` against live Redis: get/set round-trips, load-through
 * `remember`, TTL expiry, invalidation, and null (non-)caching.
 */

import { DbCacheService } from '../../core/cache/db-cache.service';
import { MetricsService } from '../../core/metrics/metrics.service';
import { createRedisTestHarness, RedisTestHarness } from './redis-test.harness';

describe('Redis Integration: Cache', () => {
  let harness: RedisTestHarness;
  let cache: DbCacheService;

  beforeAll(async () => {
    harness = await createRedisTestHarness();
    cache = new DbCacheService(harness.redis, new MetricsService());
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('set then get returns the deserialized value', async () => {
    const key = `it:cache:get:${Date.now()}`;
    const value = { id: 'msg-1', text: 'hello' };

    await cache.set('test', key, value, 60);
    await expect(cache.get<any>('test', key)).resolves.toEqual(value);
  });

  it('returns null for a missing key (miss)', async () => {
    await expect(
      cache.get<any>('test', `it:cache:absent:${Date.now()}`),
    ).resolves.toBeNull();
  });

  it('loader runs only on miss and the result is stored (remember)', async () => {
    const key = `it:cache:remember:${Date.now()}`;
    let loads = 0;
    const loader = async () => {
      loads += 1;
      return { count: loads };
    };

    const first = await cache.remember<any>('test', key, 60, loader);
    expect(first).toEqual({ count: 1 });

    const second = await cache.remember<any>('test', key, 60, loader);
    expect(second).toEqual({ count: 1 });
    expect(loads).toBe(1);
  });

  it('does not cache a null loader result', async () => {
    const key = `it:cache:null:${Date.now()}`;
    let loads = 0;
    const loader = async () => {
      loads += 1;
      return null;
    };

    await expect(
      cache.remember<any>('test', key, 60, loader),
    ).resolves.toBeNull();
    await expect(
      cache.remember<any>('test', key, 60, loader),
    ).resolves.toBeNull();
    expect(loads).toBe(2);
    await expect(cache.get<any>('test', key)).resolves.toBeNull();
  });

  it('honours the TTL and evicts after expiry', async () => {
    const key = `it:cache:ttl:${Date.now()}`;
    await cache.set('test', key, { n: 1 }, 1);
    await expect(cache.get<any>('test', key)).resolves.toEqual({ n: 1 });

    await new Promise((r) => setTimeout(r, 1100));
    await expect(cache.get<any>('test', key)).resolves.toBeNull();
  });

  it('invalidates via del and delMany', async () => {
    const a = `it:cache:del-a:${Date.now()}`;
    const b = `it:cache:del-b:${Date.now()}`;
    await cache.set('test', a, { n: 1 }, 60);
    await cache.set('test', b, { n: 2 }, 60);

    await cache.del('test', a);
    await expect(cache.get<any>('test', a)).resolves.toBeNull();
    await expect(cache.get<any>('test', b)).resolves.toEqual({ n: 2 });

    await cache.delMany('test', [b]);
    await expect(cache.get<any>('test', b)).resolves.toBeNull();
  });
});
