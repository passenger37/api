import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { CacheArchitectureService } from './cache-architecture.service';
import type { CacheArchitectureReport } from './cache-architecture.service';

/**
 * Lecture 40.83 — Cache Architecture.
 *
 * `GET /load-model/cache` — the load-model-driven cache decision table: what is
 * cached, why, the TTL, and the invalidation / consistency model, plus the
 * share of modelled read traffic the cacheable set covers. Complementing
 * `/load-model/optimiser` (40.82) and `/load-model/baseline` (40.80).
 */
@Controller('load-model')
export class CacheArchitectureController {
  constructor(private readonly architecture: CacheArchitectureService) {}

  @Public()
  @Get('cache')
  cache(): CacheArchitectureReport {
    return this.architecture.architecture();
  }
}
