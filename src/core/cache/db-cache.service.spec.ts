import { MetricsService } from '../metrics/metrics.service';
import { DbCacheService } from './db-cache.service';

describe('DbCacheService', () => {
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let metrics: MetricsService;
  let cache: DbCacheService;

  beforeEach(() => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    metrics = new MetricsService();
    cache = new DbCacheService(redis as any, metrics);
  });

  describe('get', () => {
    it('returns parsed JSON on a hit and records a hit', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ n: 5 }));
      await expect(cache.get('serverMembers', 'k')).resolves.toEqual({ n: 5 });
      expect(
        metrics.getCount('cache_hits_total', { cache: 'serverMembers' }),
      ).toBe(1);
    });

    it('returns null on a miss and records a miss', async () => {
      redis.get.mockResolvedValue(null);
      await expect(cache.get('serverMembers', 'k')).resolves.toBeNull();
      expect(
        metrics.getCount('cache_misses_total', { cache: 'serverMembers' }),
      ).toBe(1);
    });

    it('treats a corrupt payload as a miss', async () => {
      redis.get.mockResolvedValue('not-json');
      await expect(cache.get('serverMembers', 'k')).resolves.toBeNull();
      expect(
        metrics.getCount('cache_misses_total', { cache: 'serverMembers' }),
      ).toBe(1);
    });
  });

  describe('remember (load-through)', () => {
    it('returns the cached value without calling the loader on a hit', async () => {
      const item = { count: 42 };
      redis.get.mockResolvedValue(JSON.stringify(item));
      const loader = jest.fn().mockResolvedValue({ count: 7 });
      await expect(
        cache.remember('serverMembers', 'k', 60, loader),
      ).resolves.toEqual(item);
      expect(loader).not.toHaveBeenCalled();
    });

    it('calls the loader on a miss and populates the cache', async () => {
      redis.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue({ count: 7 });
      await cache.remember('serverMembers', 'k', 60, loader);
      expect(loader).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        'k',
        JSON.stringify({ count: 7 }),
        60,
      );
    });

    it('does not cache a null loader result', async () => {
      redis.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue(null);
      await expect(
        cache.remember('serverMembers', 'k', 60, loader),
      ).resolves.toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('del / delMany', () => {
    it('deletes a single key through the RedisService', async () => {
      await cache.del('serverMembers', 'k');
      expect(redis.del).toHaveBeenCalledWith('k');
    });

    it('deletes every key in a batch', async () => {
      await cache.delMany('serverMembers', ['a', 'b']);
      expect(redis.del).toHaveBeenNthCalledWith(1, 'a');
      expect(redis.del).toHaveBeenNthCalledWith(2, 'b');
    });
  });
});
