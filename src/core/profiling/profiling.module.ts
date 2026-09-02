import { Module } from '@nestjs/common';
import { ProfilingGateway } from './profiling.gateway';
import { ProfilingController } from './profiling.controller';
import { PerformanceProfilingService } from './profiling.service';

/**
 * Lecture 40.97 — Performance Profiling: live probes (CPU, memory,
 * event-loop latency, PostgreSQL, Redis, network, WebSocket throughput),
 * per-area budget evaluation, history/delta reporting, and per-route
 * latency deep dives. `GET /profiling/*` is public and mirrors the
 * `/metrics` and `/load-model` operator endpoints.
 */
@Module({
  controllers: [ProfilingController],
  providers: [PerformanceProfilingService, ProfilingGateway],
  exports: [PerformanceProfilingService],
})
export class ProfilingModule {}
