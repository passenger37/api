import { MetricsService } from '../metrics/metrics.service';
import { LoadModelService } from '../load-model/load-model.service';
import { CacheArchitectureService } from './cache-architecture.service';

describe('CacheArchitectureService', () => {
  let architecture: CacheArchitectureService;

  beforeEach(() => {
    architecture = new CacheArchitectureService(
      new LoadModelService(new MetricsService()),
    );
  });

  describe('decision model', () => {
    it('caches stable, read-heavy paths only ("do not cache everything")', () => {
      const report = architecture.architecture();
      expect(report.cacheable.map((d) => d.path).sort()).toEqual([
        'dm.open',
        'message.history',
        'search.query',
        'server.channel',
        'server.list',
        'server.members',
      ]);
      expect(report.notCached.map((d) => d.path).sort()).toEqual([
        'channel.readstate',
        'dm.send',
        'message.create',
      ]);
    });

    it('derives the TTL from the modelled stability, capped at 300s', () => {
      const report = architecture.architecture();
      const byPath = new Map(report.cacheable.map((d) => [d.path, d]));
      expect(byPath.get('server.list')!.ttlSeconds).toBe(300);
      expect(byPath.get('server.list')!.ttlSeconds).toBeLessThanOrEqual(300);
      expect(byPath.get('message.history')!.ttlSeconds).toBe(10);
    });

    it('excludes write-only paths with no cache hit potential', () => {
      const report = architecture.architecture();
      const send = report.notCached.find((d) => d.path === 'dm.send')!;
      expect(send.ttlSeconds).toBe(0);
      expect(send.consistency).toBe('none');
      expect(send.why).toContain('write-only');
    });
  });

  describe('coverage', () => {
    it('reports the share of modelled read traffic served via the cache', () => {
      const report = architecture.architecture();
      // message.history(25) + dm.open(8) + server.list(3) + search.query(5) = 41 / 100
      expect(report.readCoverage).toBeCloseTo(0.41, 2);
    });

    it('carries the load model version', () => {
      const report = architecture.architecture();
      expect(report.modelVersion).toBeTruthy();
      expect(report.peakOpsPerSec).toBeGreaterThan(0);
    });
  });
});
