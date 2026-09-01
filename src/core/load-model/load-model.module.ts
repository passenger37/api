import { Global, Module } from '@nestjs/common';
import { LoadModelService } from './load-model.service';
import { LoadModelController } from './load-model.controller';

@Global()
@Module({
  providers: [LoadModelService],
  controllers: [LoadModelController],
  exports: [LoadModelService],
})
export class LoadModelModule {}
