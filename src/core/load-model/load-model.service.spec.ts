import { MetricsService } from '../metrics/metrics.service';
import { LoadModelService } from './load-model.service';
import { LOAD_MODEL } from './load-model.config';

describe('LoadModelService', () => {
  let metrics: MetricsService;
  let service: LoadModelService;

  beforeEach(() => {
    metrics = new MetricsService();
    service = new LoadModelService(metrics);
  });

  describe('model', () => {
    it('models one million registered users', () => {
      expect(service.getModel().registeredUsers).toBe(1_000_000);
    });

    it('computes peak concurrent users from the concurrency curve', () => {
      const model = service.getModel();
      expect(model.peakConcurrentUsers).toBe(Math.round(1_000_000 * model.concurrentRatio));
    });

    it('derives peak Ops/sec from peak users x actions per minute', () => {
      const model = service.getModel();
      const expected = Math.round((model.peakConcurrentUsers * model.actionsPerUserPerMin) / 60);
      expect(model.peakOpsPerSec).toBe(expected);
    });

    it('operation weights sum to 100', () => {
      const sum = service.getModel().operations.reduce((s, o) => s + o.weightPct, 0);
      expect(sum).toBe(100);
    });

    it('async job weights sum to 100', () => {
      const sum = service.getModel().asyncJobs.reduce((s, j) => s + j.weightPct, 0);
      expect(sum).toBe(100);
    });

    it('default model exposes the documented 1M-user constants', () => {
      expect(service.defaultModel).toBe(LOAD_MODEL);
    });
  });

  describe('derivedTargets', () => {
    it('allocates per-operation RPS proportional to weight', () => {
      const targets = service.derivedTargets();
      const msg = targets.operations.find((o) => o.name === 'message.history');
      expect(msg).toBeDefined();
      const expectedRps = (20 / 100) * targets.peakOpsPerSec;
      expect(msg!.rps).toBeCloseTo(expectedRps, 0);
    });

    it('carries the connection limits from the model', () => {
      const targets = service.derivedTargets();
      expect(targets.maxConcurrentSockets).toBe(40_000);
      expect(targets.maxConcurrentRequests).toBe(5_000);
    });

    it('reflects env overrides for the scaling knobs', () => {
      const model = service.getModel();
      const overrides = { LOAD_USERS: '100000', LOAD_CONCURRENCY_RATIO: '0.1' };
      // call loadModel with a stubbed env through the module boundary
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cfg = require('./load-model.config');
      const custom = cfg.loadModel(overrides);
      expect(custom.registeredUsers).toBe(100_000);
      expect(custom.peakConcurrentUsers).toBe(10_000);
      expect(custom.peakOpsPerSec).toBe(Math.round(10_000 * custom.actionsPerUserPerMin / 60));
      void model;
    });
  });

  describe('baseline', () => {
    it('reports empty/unsatisfied baseline when no requests have been observed', () => {
      const report = service.baseline();
      expect(report.observed.httpRequestsTotal).toBe(0);
      expect(report.throughputAchieved).toBe(false);
    });

    it('flags a slow p99 as outside the latency SLO', () => {
      // Simulate slow requests by observing large latency values (and mirroring
      // the interceptor's http_requests_total counter).
      for (let i = 0; i < 200; i++) {
        metrics.observe('http_request_duration_ms', 5000, {
          method: 'GET',
          route: '/x',
          status: '200',
        });
        metrics.increment('http_requests_total', {
          method: 'GET',
          route: '/x',
          status: '200',
        });
      }
      const report = service.baseline();
      expect(report.observed.latency.sampleCount).toBe(200);
      expect(report.observed.httpRequestsTotal).toBe(200);
      expect(report.latencyWithinSlo).toBe(false);
    });

    it('flags an elevated error rate as outside the error SLO', () => {
      for (let i = 0; i < 10; i++) {
        metrics.observe('http_request_duration_ms', 10, {
          method: 'GET',
          route: '/x',
          status: '200',
        });
        metrics.increment('http_requests_total', {
          method: 'GET',
          route: '/x',
          status: '200',
        });
      }
      metrics.increment('http_errors_total', { method: 'GET', route: '/x', status: '500' }, 3);
      const report = service.baseline();
      expect(report.observed.httpRequestsTotal).toBe(10);
      expect(report.observed.httpErrorsTotal).toBe(3);
      expect(report.observed.errorRate).toBeCloseTo(0.3, 2);
      expect(report.errorsWithinSlo).toBe(false);
    });

    it('reports errorsWithinSlo when error rate is acceptable', () => {
      for (let i = 0; i < 1000; i++) {
        metrics.observe('http_request_duration_ms', 5, {
          method: 'GET',
          route: '/x',
          status: '200',
        });
        metrics.increment('http_requests_total', {
          method: 'GET',
          route: '/x',
          status: '200',
        });
      }
      metrics.increment('http_errors_total', { method: 'GET', route: '/x', status: '500' }, 1);
      const report = service.baseline();
      expect(report.observed.errorRate).toBeCloseTo(0.001, 3);
      expect(report.errorsWithinSlo).toBe(true);
    });

    it('aggregates job processed/failed counters', () => {
      metrics.increment('jobs_processed_total', { queue: 'q', job: 'outbox', status: 'success' }, 50);
      metrics.increment('jobs_failed_total', { queue: 'q', job: 'outbox' }, 5);
      const report = service.baseline();
      expect(report.observed.jobsProcessedTotal).toBe(50);
      expect(report.observed.jobsFailedTotal).toBe(5);
    });
  });
});
