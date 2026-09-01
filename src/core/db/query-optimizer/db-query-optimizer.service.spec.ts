import { MetricsService } from '../../metrics/metrics.service';
import { LoadModelService } from '../../load-model/load-model.service';
import { DbQueryOptimizerService } from './db-query-optimizer.service';
import { QUERY_PATHS, loadQueryPaths } from './db-query-path';

describe('DbQueryOptimizerService', () => {
  let optimizer: DbQueryOptimizerService;
  let loadModel: LoadModelService;

  beforeEach(() => {
    loadModel = new LoadModelService(new MetricsService());
    optimizer = new DbQueryOptimizerService(loadModel);
  });

  describe('report shape', () => {
    it('reports one plan per registered hot query path', () => {
      const report = optimizer.optimise();
      expect(report.paths).toHaveLength(QUERY_PATHS.length);
    });

    it('carries the load model version and peak ops/sec into the report', () => {
      const report = optimizer.optimise();
      expect(report.modelVersion).toBe(loadModel.getModel().version);
      expect(report.peakOpsPerSec).toBe(loadModel.derivedTargets().peakOpsPerSec);
    });

    it('tags the improvement verdict by comparing pre/post rows scanned', () => {
      const report = optimizer.optimise();
      expect(report.totals.baselineRowsPerSec).toBeGreaterThan(report.totals.optimisedRowsPerSec);
      expect(report.totals.reduction).toBeGreaterThan(0);
      expect(report.improved).toBe(true);
    });
  });

  describe('plan selection', () => {
    it('chooses the most selective (lowest cost) access path per path', () => {
      const report = optimizer.optimise();
      for (const plan of report.paths) {
        const path = QUERY_PATHS.find((p) => p.name === plan.name)!;
        const best = [...path.accessPaths].sort((a, b) => a.selectivity - b.selectivity)[0];
        expect(plan.chosen.strategy).toBe(best.strategy);
        expect(plan.chosen.rowsPerRequest).toBeLessThanOrEqual(plan.baseline.rowsPerRequest);
      }
    });

    it('prefers a partial index for the E2EE delivery pickup path', () => {
      const report = optimizer.optimise();
      const e2ee = report.paths.find((p) => p.name === 'e2ee.delivery')!;
      expect(e2ee.chosen.strategy).toBe('partial');
      expect(e2ee.reduction).toBeGreaterThan(0.9);
    });

    it('keeps every chosen plan within the modelled latency SLO at peak', () => {
      const report = optimizer.optimise();
      for (const plan of report.paths) {
        expect(plan.chosen.withinSlo).toBe(true);
      }
      expect(report.totals.allWithinSlo).toBe(true);
    });
  });

  describe('load-model driven behaviour', () => {
    it('scales the projected wait-set rows with the modelled peak ops/sec', () => {
      const atPeak = optimizer.optimise();
      const atQuarter = optimizer.optimise({
        LOAD_USERS: '250000',
      } as NodeJS.ProcessEnv);
      const peakRows = atPeak.totals.baselineRowsPerSec;
      const quarterRows = atQuarter.totals.baselineRowsPerSec;
      // Fewer modelled users => lower ops/sec => fewer projected rows/sec.
      expect(quarterRows).toBeLessThan(peakRows);
    });

    it('honours per-access-path env overrides for selectivity', () => {
      const env = { QP_E2EE_PICK: '0.5' } as NodeJS.ProcessEnv;
      const paths = loadQueryPaths(env);
      const e2ee = paths.find((p) => p.name === 'e2ee.delivery')!;
      const pick = e2ee.accessPaths.find((ap) => ap.id === 'pick-batch')!;
      expect(pick.selectivity).toBe(0.5);
    });
  });

  describe('registry integrity', () => {
    it('defines at least a baseline and one optimised path per hot path', () => {
      for (const path of QUERY_PATHS) {
        expect(path.accessPaths.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
