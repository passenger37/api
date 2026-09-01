/**
 * Lecture 40.83 — Cache Architecture.
 *
 * A small, generic cache-aside service backed by the shared RedisService. It
 * stores JSON-serialized values with a per-cache-name TTL and reports hit/miss
 * counters to the 40.79 MetricsService (`cache_hits_total{cache}` /
 * `cache_misses_total{cache}`) so the load-model baseline / `/metrics` can track
 * a real hit-rate for each cache and confirm the architecture is effective.
 *
 * It implements the decision model from `cache-architecture.service.ts`: only
 * read-heavy, stable hot paths are routed through this cache ("do not cache
 * everything").
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';

export interface CacheGetOptions {
  /** Overrides the cache's configured TTL (seconds) for this write. */
  ttlSeconds?: number;
}

@Injectable()
export class DbCacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Load-through read: return the cached value when present, otherwise run
   * `loader`, populate the cache, and return. `null` results are not cached
   * (avoids caching "nothing found" embeds permanent misses).
   */
  async remember<T>(
    cache: string,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T | null>,
  ): Promise<T | null> {
    const hit = await this.get<T>(cache, key);
    if (hit !== null) return hit;

    const value = await loader();
    if (value !== null) {
      await this.set(cache, key, value, ttlSeconds);
    }
    return value;
  }

  async get<T>(cache: string, key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) {
      this.metrics.increment('cache_misses_total', { cache });
      return null;
    }
    this.metrics.increment('cache_hits_total', { cache });
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt payload — treat as a miss and allow re-population.
      this.metrics.increment('cache_misses_total', { cache });
      return null;
    }
  }

  async set<T>(
    cache: string,
    key: string,
    value: T,
    ttlSeconds: number,
    _options?: CacheGetOptions,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(cache: string, key: string): Promise<void> {
    await this.redis.del(key);
  }

  /** Delete several keys atomically-as-possible (sequential del). */
  async delMany(cache: string, keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.redis.del(key);
    }
  }
}
