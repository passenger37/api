import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';

import { MetricsService } from '../metrics/metrics.service';
import { PerformanceProfilingService } from './profiling.service';
import { ProfilingController } from './profiling.controller';
import {
  PROFILE_AREAS,
  ProfileAreaId,
  SessionProfile,
} from './profiling.types';
import {
  assessArea,
  buildDeltaReport,
  computeDeltaRows,
  evaluateOverall,
  percentile,
  summarize,
} from './profiling-stats';
import { profilingBudgets, sampleCountFor } from './profiling.config';
import {
  sampleMemory,
  sampleProcessCpu,
  ProbeResult,
} from './profiling-samplers';

const valuesFor =
  (v: number): (() => Promise<ProbeResult>) =>
  () =>
    Promise.resolve({ values: [v, v, v, v, v] });

const allOkSamplers = {
  cpu: valuesFor(5),
  memory: valuesFor(500),
  'event-loop': valuesFor(5),
  postgres: valuesFor(5),
  redis: valuesFor(1),
  network: valuesFor(5),
  websocket: valuesFor(10),
} as const;

function makeConfig(dir: string): ConfigService {
  return {
    get: <T>(key: string, fallback: T): T => {
      if (key === 'PROFILE_DATA_DIR') return (dir || '') as unknown as T;
      if (key === 'PORT') return undefined as unknown as T;
      return fallback;
    },
  } as unknown as ConfigService;
}

function sessionOf(
  id: string,
  area: ProfileAreaId,
  values: number[],
): SessionProfile {
  const budget = profilingBudgets({}).find((b) => b.area === area)?.budget ?? 1;
  const assessment = assessArea(area, 'ms', budget, values);
  return {
    id,
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:00:01.000Z',
    instanceId: 'test',
    sampleCount: values.length,
    areas: [assessment],
    routes: [],
    overall: assessment.status,
  };
}

describe('Lecture 40.97 performance profiling', () => {
  const tmpDirs: string[] = [];
  const freshDir = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-profiling-'));
    tmpDirs.push(dir);
    return dir;
  };

  const makeService = (
    dir?: string,
    metrics?: MetricsService,
  ): PerformanceProfilingService =>
    new PerformanceProfilingService(
      makeConfig(dir ?? freshDir()),
      metrics ?? new MetricsService(),
    );

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('stats', () => {
    it('percentile + summarize compute nearest-rank statistics', () => {
      const values = Array.from({ length: 20 }, (_, i) => i + 1);
      expect(percentile(values, 50)).toBe(10);
      expect(percentile(values, 95)).toBe(19);
      expect(percentile([42], 99)).toBe(42);
      const empty = summarize([]);
      expect(empty).toEqual({
        count: 0,
        min: null,
        p50: null,
        p95: null,
        max: null,
      });
      const s = summarize([3, 1, 2]);
      expect(s.min).toBe(1);
      expect(s.max).toBe(3);
    });

    it('assessArea classifies ok / warning / degraded / unavailable', () => {
      expect(assessArea('redis', 'ms', 5, [1, 2, 3]).status).toBe('ok');
      expect(assessArea('redis', 'ms', 5, [4.5]).status).toBe('warning');
      expect(assessArea('redis', 'ms', 5, [6, 7, 8]).status).toBe('degraded');
      expect(assessArea('redis', 'ms', 5, [], 'down').status).toBe(
        'unavailable',
      );
      const ok = assessArea('event-loop', 'ms', 30, [2, 4, 6]);
      expect(ok).toMatchObject({ area: 'event-loop', unit: 'ms', budget: 30 });
      expect(ok.p95).toBeLessThanOrEqual(30);
    });

    it('evaluateOverall aggregates worst-case status', () => {
      const ok = assessArea('cpu', '%', 80, [5]);
      expect(evaluateOverall([ok, ok])).toBe('ok');
      const warn = assessArea('redis', 'ms', 5, [4.5]);
      expect(evaluateOverall([ok, warn])).toBe('warning');
      const bad = assessArea('network', 'ms', 50, [60]);
      expect(evaluateOverall([warn, bad])).toBe('degraded');
    });

    it('computeDeltaRows reports improved / degraded / new / unavailable', () => {
      const baseline = sessionOf('b', 'network', [5]);
      const improved = sessionOf('c', 'network', [4]);
      const degraded = sessionOf('d', 'network', [60]);
      const unavailable = sessionOf('e', 'network', []);
      const rows = computeDeltaRows(baseline, improved);
      expect(rows[0].verdict).toBe('improved');
      expect(rows[0].changePct).toBe(-20);
      expect(computeDeltaRows(baseline, degraded)[0].verdict).toBe('degraded');
      expect(computeDeltaRows(baseline, unavailable)[0].verdict).toBe(
        'unavailable',
      );

      const onlyNew = computeDeltaRows(baseline, sessionOf('f', 'redis', [1]));
      const row = onlyNew.find((r) => r.area === 'redis')!;
      expect(row.verdict).toBe('new');
      expect(row.changePct).toBeNull();
    });

    it('buildDeltaReport handles missing sessions and equal-id sessions', () => {
      expect(buildDeltaReport(null, null)).toEqual({
        baselineId: null,
        currentId: null,
        rows: [],
      });
      const a = sessionOf('a', 'redis', [1]);
      expect(buildDeltaReport(a, null)).toEqual({
        baselineId: 'a',
        currentId: null,
        rows: [],
      });
    });
  });

  describe('config budgets', () => {
    it('defines the seven B2 40.87 study areas with reference budgets', () => {
      const budgets = profilingBudgets({});
      expect(budgets).toHaveLength(PROFILE_AREAS.length);
      const byArea = new Map(budgets.map((b) => [b.area, b]));
      expect(byArea.get('cpu')).toMatchObject({ unit: '%', budget: 80 });
      expect(byArea.get('memory')).toMatchObject({ unit: 'mb', budget: 1024 });
      expect(byArea.get('event-loop')).toMatchObject({ unit: 'ms' });
      expect(byArea.get('postgres')).toMatchObject({ unit: 'ms', budget: 50 });
      expect(byArea.get('redis')).toMatchObject({ unit: 'ms', budget: 5 });
      expect(byArea.get('network')).toMatchObject({ unit: 'ms', budget: 50 });
      expect(byArea.get('websocket')).toMatchObject({
        unit: 'ms',
        budget: 100,
      });
      expect(sampleCountFor({})).toBe(20);
    });
  });

  describe('sessions', () => {
    it('runs a session across every study area and persists it to JSONL', async () => {
      const dir = freshDir();
      const service = makeService(dir);
      const session = await service.runSession({
        samples: 3,
        samplers: allOkSamplers,
      });

      expect(session.areas).toHaveLength(PROFILE_AREAS.length);
      expect(new Set(session.areas.map((a) => a.area))).toEqual(
        new Set(PROFILE_AREAS),
      );
      expect(session.areas.every((a) => a.status === 'ok')).toBe(true);
      expect(session.overall).toBe('ok');
      expect(session.instanceId.length).toBeGreaterThan(0);

      const filePath = path.join(dir, 'sessions.jsonl');
      expect(fs.existsSync(filePath)).toBe(true);
      const lines = fs
        .readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean);
      expect(lines).toHaveLength(1);
      expect((JSON.parse(lines[0]) as SessionProfile).id).toBe(session.id);
    });

    it('reloads persisted history on boot', async () => {
      const dir = freshDir();
      const first = makeService(dir);
      const session = await first.runSession({ samplers: allOkSamplers });

      const rebooted = makeService(dir);
      rebooted.onModuleInit();
      expect(rebooted.latestSession()?.id).toBe(session.id);
    });

    it('keeps the in-memory ring capped and uses the oldest as baseline', async () => {
      const service = makeService();
      await service.runSession({ samples: 3, samplers: allOkSamplers });
      const firstId = service.latestSession()?.id ?? '';
      let lastId = firstId;
      for (let i = 0; i < 21; i++) {
        const s = await service.runSession({
          samples: 3,
          samplers: allOkSamplers,
        });
        lastId = s.id;
      }
      expect(service.listSessions()).toHaveLength(20);
      expect(service.latestSession()?.id).toBe(lastId);
      expect(service.baselineSession()?.id).not.toBe(firstId);
      expect(service.delta().rows).toHaveLength(PROFILE_AREAS.length);
    });

    it('flags degraded areas and the overall verdict', async () => {
      const service = makeService();
      const session = await service.runSession({
        samples: 3,
        samplers: { ...allOkSamplers, network: valuesFor(200) },
      });
      expect(session.areas.find((a) => a.area === 'network')?.status).toBe(
        'degraded',
      );
      expect(session.overall).toBe('degraded');
    });

    it('reports a delta against the baseline session', async () => {
      const service = makeService();
      await service.runSession({ samples: 3, samplers: allOkSamplers });
      const second = await service.runSession({
        samples: 3,
        samplers: { ...allOkSamplers, network: valuesFor(60) },
      });
      const delta = service.delta();
      expect(delta.currentId).toBe(second.id);
      const network = delta.rows.find((r) => r.area === 'network')!;
      expect(network.verdict).toBe('degraded');
      expect(network.changePct ?? 0).toBeGreaterThan(0);
      expect(network.currentP95).toBeGreaterThan(network.baselineP95 ?? 0);
    });
  });

  describe('route deep dive', () => {
    it('builds a per-route latency table from the HTTP histogram', () => {
      const metrics = new MetricsService();
      metrics.observe('http_request_duration_ms', 10, {
        method: 'GET',
        route: '/health',
      });
      metrics.observe('http_request_duration_ms', 20, {
        method: 'GET',
        route: '/health',
      });
      metrics.observe('http_request_duration_ms', 7, {
        method: 'GET',
        route: '/root',
      });

      const service = makeService(freshDir(), metrics);
      const rows = service.routeTable();
      expect(rows).toHaveLength(2);
      const [health, root] = rows;
      expect(health.route).toBe('/health');
      expect(health.requests).toBe(2);
      expect(health.p50Ms).toBeLessThanOrEqual(10);
      expect(health.p95Ms).not.toBeNull();
      expect(root.requests).toBe(1);
      expect(root.route).toBe('/root');
    });
  });

  describe('sampler smoke tests', () => {
    it('returns positive memory samples without real delays', async () => {
      const r = await sampleMemory({
        samples: 2,
        sleepImpl: () => Promise.resolve(),
      });
      expect(r.values).toHaveLength(2);
      expect(r.values[0]).toBeGreaterThan(0);
    });

    it('reports normalised CPU in percent', async () => {
      const r = await sampleProcessCpu({
        samples: 2,
        windowMs: 1,
        osCpus: { length: 8 },
        sleepImpl: () => Promise.resolve(),
      });
      expect(r.values).toHaveLength(2);
      expect(r.values[0]).toBeGreaterThanOrEqual(0);
      expect(r.values[0]).toBeLessThanOrEqual(100);
    });
  });

  describe('ProfilingController surface', () => {
    it('exposes session / sessions / latest / delta / routes endpoints', async () => {
      const session = sessionOf('s1', 'redis', [1]);
      const fake = {
        runSession: (opts: { samples?: number } | undefined) =>
          Promise.resolve({ ...session, sampleCount: opts?.samples ?? 20 }),
        listSessions: (limit: number | undefined) =>
          limit ? [session] : [session],
        latestSession: () => session,
        delta: () => ({ baselineId: 'b', currentId: 's1', rows: [] }),
        routeTable: () => [],
      } as unknown as PerformanceProfilingService;

      const controller = new ProfilingController(fake);
      await expect(controller.session('5')).resolves.toMatchObject({
        id: 's1',
        sampleCount: 5,
      });
      expect(controller.latest()).toBe(session);
      expect(controller.delta()).toHaveProperty('currentId', 's1');
      expect(controller.routes()).toEqual([]);
      expect(controller.sessions('3')).toHaveLength(1);
    });

    it('runs with fake samplers and real service end-to-end', async () => {
      const service = makeService();
      const controller = new ProfilingController(service);
      const session = await controller.session('5');
      expect(session.sampleCount).toBe(5);
      expect(session.areas).toHaveLength(PROFILE_AREAS.length);
    });
  });
});
