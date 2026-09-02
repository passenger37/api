import { Module } from '@nestjs/common';
import { CapacityModelController } from './capacity-model.controller';
import { CapacityModelService } from './capacity-model.service';

@Module({
  controllers: [CapacityModelController],
  providers: [CapacityModelService],
  exports: [CapacityModelService],
})
export class CapacityModelModule {}
