/**
 * Lecture 40.83 — Cache Architecture.
 *
 * Decides WHAT to cache, WHY, the TTL, and the invalidation / consistency
 * model — explicitly "do not cache everything". The decision is driven by the
 * 40.80 load model's per-path read/write split (`LoadModelSpec.db`) plus the
 * modelled operation weights:
 *
 *   - cacheable  => read-heavy (readRatio >= CACHEABLE_READ_RATIO) AND stable
 *                   (stabilitySec > 0). TTL derives from stabilitySec (capped
 *                   at CACHE_TTL_MAX_SEC). Consistency = cache-aside with
 *                   write-through invalidation (a value is evicted on write).
 *   - not cached => write-heavy or volatile paths (e.g. message.create,
 *                   dm.send, channel.readstate) — caching them would either
 *                   rarely hit or require frequent invalidation.
 *
 * `coverage()` reports what fraction of the modelled peak read traffic is
 * served through the cacheable set, so the baseline runner can confirm the
 * architecture actually covers the hot reads.
 */

import { Injectable } from '@nestjs/common';
import { LoadModelService } from '../load-model/load-model.service';

const CACHEABLE_READ_RATIO = 0.8;
const CACHE_TTL_MAX_SEC = 300;
const DEFAULT_TTL_SEC = 60;

export interface CacheDecision {
  path: string;
  readRatio: number;
  writeRatio: number;
  stabilitySec: number;
  cacheable: boolean;
  ttlSeconds: number;
  consistency: string;
  invalidation: string;
  why: string;
}

export interface CacheArchitectureReport {
  modelVersion: string;
  peakOpsPerSec: number;
  cacheable: CacheDecision[];
  notCached: CacheDecision[];
  /** Share of the modelled read-heavy operation weight served via the cache. */
  readCoverage: number;
}

@Injectable()
export class CacheArchitectureService {
  constructor(private readonly loadModel: LoadModelService) {}

  architecture(): CacheArchitectureReport {
    const model = this.loadModel.getModel();
    const decisions = model.db.map((p) => this.decide(p));

    const cacheable = decisions.filter((d) => d.cacheable);
    const notCached = decisions.filter((d) => !d.cacheable);

    // Coverage: share of the load-model operation weight that is routed
    // through cacheable read paths (the reader-visible "hot reads served").
    const totalW = model.operations.reduce((s, o) => s + o.weightPct, 0);
    const coveredW = cacheable.reduce((sum, d) => {
      const op = model.operations.find((o) => o.name === d.path);
      return sum + (op ? op.weightPct : 0);
    }, 0);
    const readCoverage =
      totalW > 0 ? Number((coveredW / totalW).toFixed(4)) : 0;

    return {
      modelVersion: model.version,
      peakOpsPerSec: model.peakOpsPerSec,
      cacheable,
      notCached,
      readCoverage,
    };
  }

  private decide(p: { path: string; readRatio: number; writeRatio: number; stabilitySec: number }): CacheDecision {
    const cacheable =
      p.readRatio >= CACHEABLE_READ_RATIO && p.stabilitySec > 0;
    const ttlSeconds = cacheable
      ? Math.min(
          p.stabilitySec > 0 ? p.stabilitySec : DEFAULT_TTL_SEC,
          CACHE_TTL_MAX_SEC,
        )
      : 0;

    return {
      path: p.path,
      readRatio: p.readRatio,
      writeRatio: p.writeRatio,
      stabilitySec: p.stabilitySec,
      cacheable,
      ttlSeconds,
      consistency: cacheable ? 'cache-aside + write-through invalidation' : 'none',
      invalidation: cacheable ? 'evict on write (del CACHE keys)' : 'n/a',
      why: cacheable
        ? `read-heavy (${Math.round(p.readRatio * 100)}%) with ${p.stabilitySec}s expected stability`
        : p.stabilitySec === 0
          ? 'write-only path — caching would not hit'
          : `readRatio ${Math.round(p.readRatio * 100)}% below cache threshold`,
    };
  }
}
