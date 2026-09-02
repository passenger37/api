import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CapacityModelService } from './capacity-model.service';
import { Public } from '../../common/decorators';

@ApiTags('Capacity Model')
@Controller('capacity-model')
export class CapacityModelController {
  constructor(private readonly capacityModelService: CapacityModelService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '1M-user capacity plan: usage assumptions + derived estimates',
  })
  report() {
    return this.capacityModelService.report();
  }

  @Public()
  @Get('estimates')
  @ApiOperation({
    summary: 'The nine B2 40.88 capacity estimates (derived from usage)',
  })
  estimates() {
    return this.capacityModelService.getModel().estimates;
  }

  @Public()
  @Get('assumptions')
  @ApiOperation({
    summary: 'Expected-product-usage assumptions backing the estimates',
  })
  assumptions() {
    return this.capacityModelService.getAssumptions();
  }
}
