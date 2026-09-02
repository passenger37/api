import { Module } from '@nestjs/common';
import { ProductionReadinessController } from './production-readiness.controller';
import { ProductionReadinessService } from './production-readiness.service';

@Module({
  controllers: [ProductionReadinessController],
  providers: [ProductionReadinessService],
  exports: [ProductionReadinessService],
})
export class ProductionReadinessModule {}
