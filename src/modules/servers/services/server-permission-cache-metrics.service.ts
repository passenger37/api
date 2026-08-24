import { Injectable } from '@nestjs/common';

export interface PermissionCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  totalRequests: number;
  hitRatio: number;
}

@Injectable()
export class ServerPermissionCacheMetricsService {
  private hits = 0;
  private misses = 0;
  private invalidations = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordInvalidation(): void {
    this.invalidations++;
  }

  getMetrics(): PermissionCacheMetrics {
    const totalRequests = this.hits + this.misses;

    const hitRatio = totalRequests === 0 ? 0 : this.hits / totalRequests;

    return {
      hits: this.hits,
      misses: this.misses,
      invalidations: this.invalidations,
      totalRequests,
      hitRatio,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.invalidations = 0;
  }
}
