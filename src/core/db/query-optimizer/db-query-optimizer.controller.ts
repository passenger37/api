import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators';
import { DbQueryOptimizerService } from './db-query-optimizer.service';
import type { OptimiserReport } from './db-query-optimizer.service';

/**
 * Lecture 40.82 — Load-model-driven DB/query optimisation.
 *
 * `GET /load-model/optimiser` — the live, load-model-driven plan selection for
 * the registered hot query paths, including the projected rows-per-second
 * reduction versus the 40.80-style baseline and whether every chosen plan stays
 * within the modelled latency SLO at peak. This is the endpoint the baseline
 * runner (`scripts/load/query-optimiser.mjs`) and `/load-model/baseline`
 * consumers consult to confirm a measured improvement.
 */
@Controller('load-model')
export class DbQueryOptimizerController {
  constructor(private readonly optimizer: DbQueryOptimizerService) {}

  @Public()
  @Get('optimiser')
  optimiser(): OptimiserReport {
    return this.optimizer.optimise();
  }
}
