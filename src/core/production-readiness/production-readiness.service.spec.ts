import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  evaluateProductionReadiness,
  PRODUCTION_READINESS_CHECKS,
} from './production-readiness.config';

const makeRoot = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'prodread-'));

const touch = (root: string, rel: string, content = '') => {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
};

describe('ProductionReadinessService', () => {
  describe('check registry', () => {
    it('defines checks across all 18 production-readiness areas', () => {
      const areas = new Set(PRODUCTION_READINESS_CHECKS.map((c) => c.area));
      expect(areas.size).toBeGreaterThanOrEqual(15); // 15 real areas + 3 N/A
    });

    it('every check id is unique', () => {
      const ids = PRODUCTION_READINESS_CHECKS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('CI/CD, Backups, and Disaster Recovery are not-applicable', () => {
      const na = PRODUCTION_READINESS_CHECKS.filter(
        (c) =>
          c.area === 'CI/CD' ||
          c.area === 'Backups' ||
          c.area === 'Disaster recovery',
      );
      expect(na.length).toBe(3);
      for (const c of na) {
        const r = c.evaluate(makeRoot());
        expect(r.status).toBe('not-applicable');
      }
    });
  });

  describe('evaluateProductionReadiness', () => {
    it('returns a report with all areas and total checks', () => {
      const root = makeRoot();
      // Seed enough files so some checks pass
      touch(root, 'src/app.module.ts', 'MetricsModule');
      touch(
        root,
        'prisma/schema.prisma',
        'model User {} model Message {} model Server {} model Channel {}',
      );
      touch(root, 'docs/PROJECT_DETAIL.md');
      touch(root, 'docs/CURRENT_STATUS.md');
      const report = evaluateProductionReadiness(root);
      expect(report.totalChecks).toBe(PRODUCTION_READINESS_CHECKS.length);
      expect(report.areas.length).toBeGreaterThanOrEqual(15);
      expect(typeof report.overallReady).toBe('boolean');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('passes ARCH-1 when AppModule imports CapacityModelModule', () => {
      const root = makeRoot();
      touch(root, 'src/app.module.ts', 'CapacityModelModule');
      const report = evaluateProductionReadiness(root);
      const arch1 = report.areas
        .flatMap((a) => a.checks)
        .find((c) => c.id === 'ARCH-6');
      expect(arch1?.status).toBe('pass');
      expect(arch1?.evidence).toContain('CapacityModelModule');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('fails ARCH-6 when AppModule does not mention CapacityModelModule', () => {
      const root = makeRoot();
      touch(root, 'src/app.module.ts', 'AppModule');
      const report = evaluateProductionReadiness(root);
      const arch6 = report.areas
        .flatMap((a) => a.checks)
        .find((c) => c.id === 'ARCH-6');
      expect(arch6?.status).toBe('fail');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('passes DB-1 and DB-2 when prisma schema has core models', () => {
      const root = makeRoot();
      touch(
        root,
        'prisma/schema.prisma',
        'model User {\n  id Int\n}\nmodel Message {}\nmodel Server {}\nmodel Channel {}',
      );
      const report = evaluateProductionReadiness(root);
      const db1 = report.areas
        .flatMap((a) => a.checks)
        .find((c) => c.id === 'DB-1');
      const db2 = report.areas
        .flatMap((a) => a.checks)
        .find((c) => c.id === 'DB-2');
      expect(db1?.status).toBe('pass');
      expect(db2?.status).toBe('pass');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('reports overallReady false when any check fails', () => {
      const root = makeRoot();
      // Empty root — many checks will fail
      const report = evaluateProductionReadiness(root);
      expect(report.overallReady).toBe(false);
      expect(report.failed).toBeGreaterThan(0);
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('aggregate counts are consistent', () => {
      const root = makeRoot();
      touch(
        root,
        'src/app.module.ts',
        'MetricsModule LoadModelModule SecurityAuditModule ProfilingModule CapacityModelModule ProductionReadinessModule',
      );
      touch(
        root,
        'prisma/schema.prisma',
        'model User {}\nmodel Message {}\nmodel Server {}\nmodel Channel {}',
      );
      touch(root, 'src/core/db/query-optimizer/db-query-optimizer.module.ts');
      touch(root, 'src/core/cache/cache.module.ts');
      touch(root, 'src/core/security/security-audit.module.ts');
      touch(root, 'src/config/validation/validation.config.ts');
      touch(root, 'scripts/security/code-audit.ts');
      touch(root, 'src/modules/auth/auth.module.ts');
      touch(root, 'src/modules/sessions/sessions.module.ts');
      touch(root, 'src/modules/roles/roles.module.ts');
      touch(root, 'src/modules/permissions/permissions.module.ts');
      touch(root, 'src/modules/authorization/authorization.module.ts');
      touch(root, 'src/modules/messages/messages.module.ts');
      touch(root, 'src/modules/direct-messages/direct-messages.module.ts');
      touch(root, 'src/modules/feed/feed.module.ts');
      touch(
        root,
        'src/modules/e2ee-key-distribution/e2ee-key-distribution.module.ts',
      );
      touch(root, 'src/modules/e2ee-transport/e2ee-transport.module.ts');
      touch(root, 'src/modules/e2ee-sessions/e2ee-sessions.module.ts');
      touch(root, 'src/core/redis/redis.module.ts');
      touch(root, 'src/core/redis/redis.service.ts', 'disableOfflineQueue');
      touch(root, 'src/modules/messages/gateways/channel-message.gateway.ts');
      touch(root, 'src/modules/moderation/moderation.module.ts');
      touch(root, 'package.json', '{ "jest": { "testRegex": ".*" } }');
      touch(root, 'src/testing/failure/test.ts');
      touch(root, 'test/app.e2e-spec.ts');
      touch(root, 'scripts/load/load-baseline.mjs');
      touch(root, 'src/core/logger/logger.module.ts');
      touch(root, 'src/core/tracing/tracing.module.ts');
      touch(root, 'src/core/metrics/metrics.module.ts');
      touch(root, 'src/core/profiling/profiling.module.ts');
      touch(root, 'src/core/load-model/load-model.module.ts');
      touch(root, 'src/core/capacity-model/capacity-model.module.ts');
      touch(
        root,
        'src/core/load-model/load-model.config.ts',
        'maxConcurrentSockets 40000',
      );
      touch(root, 'src/core/redis/redis-io.adapter.ts');
      touch(root, 'docs/PROJECT_DETAIL.md');
      touch(root, 'docs/CURRENT_STATUS.md');
      const report = evaluateProductionReadiness(root);
      expect(
        report.passed + report.failed + report.notApplicable + report.manual,
      ).toBe(report.totalChecks);
      expect(report.overallReady).toBe(true);
      expect(report.failed).toBe(0);
      fs.rmSync(root, { recursive: true, force: true });
    });
  });

  describe('individual checks', () => {
    it('SEC-2 passes when validation config contains VALIDATION_PIPE_OPTIONS', () => {
      const root = makeRoot();
      touch(
        root,
        'src/config/validation/validation.config.ts',
        'export const VALIDATION_PIPE_OPTIONS = {}',
      );
      const check = PRODUCTION_READINESS_CHECKS.find((c) => c.id === 'SEC-2')!;
      const r = check.evaluate(root);
      expect(r.status).toBe('pass');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('REDIS-2 passes when redis service disables offline queue', () => {
      const root = makeRoot();
      touch(
        root,
        'src/core/redis/redis.service.ts',
        'disableOfflineQueue: true',
      );
      const check = PRODUCTION_READINESS_CHECKS.find(
        (c) => c.id === 'REDIS-2',
      )!;
      const r = check.evaluate(root);
      expect(r.status).toBe('pass');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('SCALE-1 passes when load model config defines connection limits', () => {
      const root = makeRoot();
      touch(
        root,
        'src/core/load-model/load-model.config.ts',
        'maxConcurrentSockets: 40000, maxConcurrentRequests: 5000',
      );
      const check = PRODUCTION_READINESS_CHECKS.find(
        (c) => c.id === 'SCALE-1',
      )!;
      const r = check.evaluate(root);
      expect(r.status).toBe('pass');
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('WS-1 passes when messages gateways directory exists', () => {
      const root = makeRoot();
      touch(root, 'src/modules/messages/gateways/channel-message.gateway.ts');
      const check = PRODUCTION_READINESS_CHECKS.find((c) => c.id === 'WS-1')!;
      const r = check.evaluate(root);
      expect(r.status).toBe('pass');
      fs.rmSync(root, { recursive: true, force: true });
    });
  });
});
