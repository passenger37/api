import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  describe('increment', () => {
    it('should start at 0 for an unknown counter', () => {
      expect(metrics.getCount('unknown_total')).toBe(0);
    });

    it('should count increments', () => {
      metrics.increment('jobs_processed_total', { queue: 'jobs:default', status: 'success' });
      metrics.increment('jobs_processed_total', { queue: 'jobs:default', status: 'success' });
      metrics.increment('jobs_processed_total', { queue: 'jobs:default', status: 'failed' });

      expect(metrics.getCount('jobs_processed_total', { queue: 'jobs:default', status: 'success' })).toBe(2);
      expect(metrics.getCount('jobs_processed_total', { queue: 'jobs:default', status: 'failed' })).toBe(1);
    });

    it('should support an increment amount', () => {
      metrics.increment('jobs_failed_total', { queue: 'q' }, 5);
      expect(metrics.getCount('jobs_failed_total', { queue: 'q' })).toBe(5);
    });

    it('should separate label sets', () => {
      metrics.increment('http_requests_total', { method: 'GET', status: '200' });
      metrics.increment('http_requests_total', { method: 'POST', status: '200' });

      expect(metrics.getCount('http_requests_total', { method: 'GET', status: '200' })).toBe(1);
      expect(metrics.getCount('http_requests_total', { method: 'POST', status: '200' })).toBe(1);
    });
  });

  describe('observeDuration', () => {
    it('should accumulate sum and count', () => {
      metrics.observeDuration('http_request_duration_ms', 10, { route: '/health' });
      metrics.observeDuration('http_request_duration_ms', 30, { route: '/health' });

      const out = metrics.renderPrometheus();
      expect(out).toContain('http_request_duration_ms_sum{route="/health"} 40');
      expect(out).toContain('http_request_duration_ms_count{route="/health"} 2');
    });

    it('should bucket values by le (cumulative)', () => {
      metrics.observeDuration('http_request_duration_ms', 12, { route: '/a' });
      const out = metrics.renderPrometheus();
      // 12 > 10 -> 0; 12 <= 25 -> 1 (cumulative)
      expect(out).toContain('http_request_duration_ms_bucket{route="/a",le="10"} 0');
      expect(out).toContain('http_request_duration_ms_bucket{route="/a",le="25"} 1');
      expect(out).toContain('http_request_duration_ms_bucket{route="/a",le="+Inf"} 1');
    });
  });

  describe('renderPrometheus', () => {
    it('should render counters with labels in Prometheus format', () => {
      metrics.increment('jobs_enqueued_total', { queue: 'jobs:default', job: 'send-email' });
      const out = metrics.renderPrometheus();

      expect(out).toContain('jobs_enqueued_total{job="send-email",queue="jobs:default"} 1');
    });

    it('should render unlabeled counters without braces', () => {
      metrics.increment('jobs_failed_total');
      expect(metrics.renderPrometheus()).toContain('jobs_failed_total 1');
    });
  });

  describe('snapshot', () => {
    it('should flatten counters', () => {
      metrics.increment('jobs_failed_total', { queue: 'q' });
      expect(metrics.snapshot()['jobs_failed_total{queue="q"}']).toBe(1);
    });
  });
});
