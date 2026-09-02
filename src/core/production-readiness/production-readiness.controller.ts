import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductionReadinessService } from './production-readiness.service';
import { Public } from '../../common/decorators';

@ApiTags('Production Readiness')
@Controller('production-readiness')
export class ProductionReadinessController {
  constructor(
    private readonly productionReadinessService: ProductionReadinessService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'B2 40.89 — production readiness checklist across 18 areas',
  })
  report() {
    return this.productionReadinessService.evaluate();
  }
}
