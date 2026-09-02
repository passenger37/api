import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PerformanceProfilingService } from './profiling.service';
import type { SessionProfile, DeltaReport } from './profiling.types';

@ApiTags('Performance Profiling')
@Controller('profiling')
export class ProfilingController {
  constructor(private readonly profiling: PerformanceProfilingService) {}

  @Public()
  @Get('session')
  @ApiOperation({
    summary: '40.97 — run a profiling session across the study list',
  })
  session(@Query('samples') samples?: string): Promise<SessionProfile> {
    return this.profiling.runSession({
      ...(samples ? { samples: Number(samples) } : {}),
    });
  }

  @Public()
  @Get('sessions')
  @ApiOperation({ summary: '40.97 — recent profiling sessions (newest first)' })
  sessions(@Query('limit') limit?: string): SessionProfile[] {
    return this.profiling.listSessions(
      limit ? Math.min(Number(limit) || 1, 100) : undefined,
    );
  }

  @Public()
  @Get('latest')
  @ApiOperation({ summary: '40.97 — last recorded profiling session' })
  latest(): SessionProfile | null {
    return this.profiling.latestSession();
  }

  @Public()
  @Get('delta')
  @ApiOperation({ summary: '40.97 — latest session vs baseline delta report' })
  delta(): DeltaReport {
    return this.profiling.delta();
  }

  @Public()
  @Get('routes')
  @ApiOperation({ summary: '40.97 — per-route HTTP latency deep-dive table' })
  routes(): SessionProfile['routes'] {
    return this.profiling.routeTable();
  }
}
