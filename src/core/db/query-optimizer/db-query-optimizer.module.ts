import { Module } from '@nestjs/common';
import { DbQueryOptimizerService } from './db-query-optimizer.service';
import { DbQueryOptimizerController } from './db-query-optimizer.controller';

/**
 * Lecture 40.82 — Load-model-driven DB/query optimisation.
 *
 * LoadModelModule is @Global (exports LoadModelService), so DbQueryOptimizerService
 * can inject the load-model targets directly without an explicit import.
 */
@Module({
  controllers: [DbQueryOptimizerController],
  providers: [DbQueryOptimizerService],
  exports: [DbQueryOptimizerService],
})
export class DbQueryOptimizerModule {}
