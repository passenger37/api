import { Injectable } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { LoadModelSpec, loadModel, LOAD_MODEL } from './load-model.config';

export interface OperationTarget {
  name: string;
  /** Modelled requests/second for this operation at peak. */
  rps: number;
  p50SloMs: number;
  p99SloMs: number;
  errorRateMax: number;
}

export interface ModelTargets {
  peakOpsPerSec: number;
  operations: OperationTarget[];
  maxConcurrentSockets: number;
  maxConcurrentRequests: number;
  asyncJobs: LoadModelSpec['asyncJobs'];
  /** Modelled background jobs enqueued per second at peak. */
  jobsPerSec: number;
}

export interface BaselineObserved {
  httpRequestsTotal: number;
  httpErrorsTotal: number;
  errorRate: number;
  latency: { p50Ms: number; p95Ms: number; p99Ms: number; sampleCount: number };
  jobsProcessedTotal: number;
  jobsFailedTotal: number;
}

export interface BaselineReport {
  modelVersion: string;
  targets: ModelTargets;
  observed: BaselineObserved;
  /** true when observed aggregate throughput >= modelled peak Ops/sec. */
  throughputAchieved: boolean;
  /** true when observed aggregate p99 <= a representative p99 SLO. */
  latencyWithinSlo: boolean;
  /** true when observed error rate <= the strictest operation error SLO. */
  errorsWithinSlo: boolean;
}

/**
 * Models the 1M-user workload, derives per-operation throughput targets, and
 * compares the live in-process metrics snapshot (fed by 40.79's MetricsService)
 * against the model's latency / error SLOs. Produces the baseline that the
 * scale/performance lectures (40.81+) use to drive optimisation.
 */
@Injectable()
export class LoadModelService {
  constructor(private readonly metrics: MetricsService) {}

  getModel(): LoadModelSpec {
    return loadModel();
  }

  /** Derive per-operation RPS targets from the model. */
  derivedTargets(): ModelTargets {
    const model = loadModel();
    const total = model.operations.reduce((s, o) => s + o.weightPct, 0);
    const operations: OperationTarget[] = model.operations.map((op) => ({
      name: op.name,
      rps: Number(((op.weightPct / total) * model.peakOpsPerSec).toFixed(1)),
      p50SloMs: op.p50Ms,
      p99SloMs: op.p99Ms,
      errorRateMax: op.errorRateMax,
    }));

    // Assumes every message/attachment/search activity also schedules an async
    // unit of work (outbox + media + search indexing), i.e. jobs ~ peakOpsPerSec.
    const jobsPerSec = model.peakOpsPerSec;

    return {
      peakOpsPerSec: model.peakOpsPerSec,
      operations,
      maxConcurrentSockets: model.connections.maxConcurrentSockets,
      maxConcurrentRequests: model.connections.maxConcurrentRequests,
      asyncJobs: model.asyncJobs,
      jobsPerSec,
    };
  }

  /** Capture the live aggregate baseline from the in-process metrics store. */
  observed(): BaselineObserved {
    const agg = this.metrics.aggregatePercentiles(
      'http_request_duration_ms',
      [50, 95, 99],
    );
    const latency = agg
      ? {
          sampleCount: agg.count,
          p50Ms: agg.percentiles[0].valueMs,
          p95Ms: agg.percentiles[1].valueMs,
          p99Ms: agg.percentiles[2].valueMs,
        }
      : { sampleCount: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };

    const sumCounterByPrefix = (prefix: string): number => {
      let total = 0;
      for (const [key, value] of Object.entries(this.metrics.snapshot())) {
        if (key.startsWith(prefix)) total += value;
      }
      return total;
    };

    const httpErrorsTotal = sumCounterByPrefix('http_errors_total');
    const httpRequestsTotal = sumCounterByPrefix('http_requests_total');
    const errorRate =
      httpRequestsTotal > 0 ? httpErrorsTotal / httpRequestsTotal : 0;

    const jobsProcessedTotal = sumCounterByPrefix('jobs_processed_total');
    const jobsFailedTotal = sumCounterByPrefix('jobs_failed_total');

    return {
      httpRequestsTotal,
      httpErrorsTotal,
      errorRate: Number(errorRate.toFixed(4)),
      latency: {
        ...latency,
        p50Ms: Number(latency.p50Ms.toFixed(2)),
        p95Ms: Number(latency.p95Ms.toFixed(2)),
        p99Ms: Number(latency.p99Ms.toFixed(2)),
      },
      jobsProcessedTotal,
      jobsFailedTotal,
    };
  }

  /** Compose the model, targets, and live baseline into a single report. */
  baseline(): BaselineReport {
    const targets = this.derivedTargets();
    const observed = this.observed();
    const model = loadModel();

    const throughputAchieved =
      observed.httpRequestsTotal >= targets.peakOpsPerSec;
    // Representative p99 SLO: median of per-operation p99 SLOs.
    const slos = model.operations.map((o) => o.p99Ms).sort((a, b) => a - b);
    const medianSlo = slos[Math.floor(slos.length / 2)];
    const latencyWithinSlo =
      observed.latency.sampleCount === 0 || observed.latency.p99Ms <= medianSlo;
    const strictestError = Math.min(
      ...model.operations.map((o) => o.errorRateMax),
    );
    const errorsWithinSlo =
      observed.httpRequestsTotal === 0 || observed.errorRate <= strictestError;

    return {
      modelVersion: model.version,
      targets,
      observed,
      throughputAchieved,
      latencyWithinSlo,
      errorsWithinSlo,
    };
  }

  /** Expose the default (unenriched) model for documentation/tests. */
  get defaultModel(): LoadModelSpec {
    return LOAD_MODEL;
  }
}
