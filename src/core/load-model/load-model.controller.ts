import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoadModelService } from './load-model.service';
import { Public } from '../../common/decorators';

@ApiTags('Load Model')
@Controller('load-model')
export class LoadModelController {
  constructor(private readonly loadModelService: LoadModelService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '1M-user workload model + derived throughput targets',
  })
  model() {
    return {
      model: this.loadModelService.getModel(),
      targets: this.loadModelService.derivedTargets(),
    };
  }

  @Public()
  @Get('baseline')
  @ApiOperation({
    summary: 'Live baseline: model targets vs observed in-process metrics',
  })
  baseline() {
    return this.loadModelService.baseline();
  }
}
