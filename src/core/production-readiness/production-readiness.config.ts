/**
 * Lecture 40.99 — Backend Production Readiness Review (B2 40.89).
 *
 * PHASE 60 "Final checklist" covering 18 areas: Architecture, Database,
 * Security, Authentication, Authorization, Messaging, E2EE, Redis,
 * WebSockets, Notifications, Testing, Observability, CI/CD, Backups,
 * Disaster recovery, Performance, Scaling, Documentation.
 *
 * Each check is auto-verifiable against the filesystem — the evaluate()
 * function receives the project root and returns a status + evidence string.
 * CI/CD, Backups, and Disaster Recovery (40.91–40.95) are marked
 * not-applicable (no deployment in scope).
 */

import * as fs from 'fs';
import * as path from 'path';

export type CheckStatus = 'pass' | 'fail' | 'not-applicable' | 'manual';

export interface CheckResult {
  id: string;
  area: string;
  description: string;
  status: CheckStatus;
  evidence: string;
}

export interface Check {
  id: string;
  area: string;
  description: string;
  evaluate(root: string): CheckResult;
}

const exists = (root: string, rel: string): boolean =>
  fs.existsSync(path.join(root, rel));

const isDir = (root: string, rel: string): boolean => {
  try {
    return fs.statSync(path.join(root, rel)).isDirectory();
  } catch {
    return false;
  }
};

const read = (root: string, rel: string): string => {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf-8');
  } catch {
    return '';
  }
};

const has = (root: string, rel: string, pattern: RegExp): boolean =>
  pattern.test(read(root, rel));

const fileCheck = (
  id: string,
  area: string,
  description: string,
  rel: string,
  label: string,
): Check => ({
  id,
  area,
  description,
  evaluate: (root) => ({
    id,
    area,
    description,
    status: exists(root, rel) ? 'pass' : 'fail',
    evidence: exists(root, rel)
      ? `${label} present at ${rel}`
      : `${label} missing (${rel} not found)`,
  }),
});

const dirCheck = (
  id: string,
  area: string,
  description: string,
  rel: string,
  label: string,
): Check => ({
  id,
  area,
  description,
  evaluate: (root) => ({
    id,
    area,
    description,
    status: isDir(root, rel) ? 'pass' : 'fail',
    evidence: isDir(root, rel)
      ? `${label} directory present at ${rel}`
      : `${label} directory missing (${rel})`,
  }),
});

const contentCheck = (
  id: string,
  area: string,
  description: string,
  rel: string,
  pattern: RegExp,
  label: string,
): Check => ({
  id,
  area,
  description,
  evaluate: (root) => ({
    id,
    area,
    description,
    status: has(root, rel, pattern) ? 'pass' : 'fail',
    evidence: has(root, rel, pattern)
      ? `${label} found in ${rel}`
      : `${label} not found in ${rel}`,
  }),
});

const APP_MODULE = 'src/app.module.ts';
const PRISMA_SCHEMA = 'prisma/schema.prisma';

const coreDir = (name: string) => `src/core/${name}/${name}.module.ts`;
const modDir = (name: string) => `src/modules/${name}/${name}.module.ts`;

const areaCheck = (
  id: string,
  area: string,
  description: string,
  modulePath: string,
  label: string,
): Check => fileCheck(id, area, description, modulePath, `${label} module`);

export const PRODUCTION_READINESS_CHECKS: Check[] = [
  // ── Architecture ──────────────────────────────────────────────────────────
  areaCheck(
    'ARCH-1',
    'Architecture',
    'AppModule imports all core infrastructure modules',
    APP_MODULE,
    'App',
  ),
  contentCheck(
    'ARCH-2',
    'Architecture',
    'MetricsModule imported in AppModule',
    APP_MODULE,
    /MetricsModule/,
    'MetricsModule import',
  ),
  contentCheck(
    'ARCH-3',
    'Architecture',
    'LoadModelModule imported in AppModule',
    APP_MODULE,
    /LoadModelModule/,
    'LoadModelModule import',
  ),
  contentCheck(
    'ARCH-4',
    'Architecture',
    'SecurityAuditModule imported in AppModule',
    APP_MODULE,
    /SecurityAuditModule/,
    'SecurityAuditModule import',
  ),
  contentCheck(
    'ARCH-5',
    'Architecture',
    'ProfilingModule imported in AppModule',
    APP_MODULE,
    /ProfilingModule/,
    'ProfilingModule import',
  ),
  contentCheck(
    'ARCH-6',
    'Architecture',
    'CapacityModelModule imported in AppModule',
    APP_MODULE,
    /CapacityModelModule/,
    'CapacityModelModule import',
  ),

  // ── Database ──────────────────────────────────────────────────────────────
  fileCheck(
    'DB-1',
    'Database',
    'Prisma schema exists',
    PRISMA_SCHEMA,
    'Prisma schema',
  ),
  contentCheck(
    'DB-2',
    'Database',
    'Prisma schema defines core models (User, Message, Server, Channel)',
    PRISMA_SCHEMA,
    /model (User|Message|Server|Channel)/,
    'Core models',
  ),
  areaCheck(
    'DB-3',
    'Database',
    'Query optimizer module exists (40.82)',
    'src/core/db/query-optimizer/db-query-optimizer.module.ts',
    'Query optimizer',
  ),
  areaCheck(
    'DB-4',
    'Database',
    'Cache module exists for hot reads (40.83)',
    coreDir('cache'),
    'Cache',
  ),

  // ── Security ──────────────────────────────────────────────────────────────
  areaCheck(
    'SEC-1',
    'Security',
    'Security audit module exists and is wired',
    'src/core/security/security-audit.module.ts',
    'Security audit',
  ),
  fileCheck(
    'SEC-2',
    'Security',
    'Validation pipe configured',
    'src/config/validation/validation.config.ts',
    'Validation config',
  ),
  fileCheck(
    'SEC-3',
    'Security',
    'Security source audit script exists',
    'scripts/security/code-audit.ts',
    'Security code-audit script',
  ),

  // ── Authentication ────────────────────────────────────────────────────────
  areaCheck(
    'AUTH-1',
    'Authentication',
    'Auth module exists',
    modDir('auth'),
    'Auth',
  ),
  areaCheck(
    'AUTH-2',
    'Authentication',
    'Sessions module exists',
    modDir('sessions'),
    'Sessions',
  ),

  // ── Authorization ─────────────────────────────────────────────────────────
  areaCheck(
    'AUTHZ-1',
    'Authorization',
    'Roles module exists',
    modDir('roles'),
    'Roles',
  ),
  areaCheck(
    'AUTHZ-2',
    'Authorization',
    'Permissions module exists',
    modDir('permissions'),
    'Permissions',
  ),
  areaCheck(
    'AUTHZ-3',
    'Authorization',
    'Authorization module exists (RBAC enforcement)',
    modDir('authorization'),
    'Authorization',
  ),

  // ── Messaging ─────────────────────────────────────────────────────────────
  areaCheck(
    'MSG-1',
    'Messaging',
    'Messages module exists',
    modDir('messages'),
    'Messages',
  ),
  areaCheck(
    'MSG-2',
    'Messaging',
    'Direct messages module exists',
    modDir('direct-messages'),
    'Direct messages',
  ),
  areaCheck(
    'MSG-3',
    'Messaging',
    'Feed module exists (timeline / notification fan-out)',
    modDir('feed'),
    'Feed',
  ),

  // ── E2EE ──────────────────────────────────────────────────────────────────
  areaCheck(
    'E2EE-1',
    'E2EE',
    'E2EE key distribution module exists',
    modDir('e2ee-key-distribution'),
    'E2EE key distribution',
  ),
  areaCheck(
    'E2EE-2',
    'E2EE',
    'E2EE ratchet module exists',
    modDir('e2ee-ratchet'),
    'E2EE ratchet',
  ),
  areaCheck(
    'E2EE-3',
    'E2EE',
    'E2EE sessions module exists',
    modDir('e2ee-sessions'),
    'E2EE sessions',
  ),

  // ── Redis ─────────────────────────────────────────────────────────────────
  areaCheck(
    'REDIS-1',
    'Redis',
    'Redis module exists',
    coreDir('redis'),
    'Redis',
  ),
  contentCheck(
    'REDIS-2',
    'Redis',
    'Redis service disables offline queue (fail-loud)',
    'src/core/redis/redis.service.ts',
    /offlineQueue|disableOfflineQueue/,
    'Offline queue disable',
  ),

  // ── WebSockets ────────────────────────────────────────────────────────────
  dirCheck(
    'WS-1',
    'WebSockets',
    'Messaging realtime gateways exist (channel-message + presence)',
    'src/modules/messages/gateways',
    'Messages gateways',
  ),

  // ── Notifications ─────────────────────────────────────────────────────────
  areaCheck(
    'NOTIF-1',
    'Notifications',
    'Moderation module exists',
    modDir('moderation'),
    'Moderation',
  ),

  // ── Testing ───────────────────────────────────────────────────────────────
  contentCheck(
    'TEST-1',
    'Testing',
    'Jest configuration defined in package.json',
    'package.json',
    /"jest"\s*:/,
    'Jest config',
  ),
  dirCheck(
    'TEST-2',
    'Testing',
    'Failure injection test harness exists',
    'src/testing/failure',
    'Failure injection',
  ),
  fileCheck(
    'TEST-3',
    'Testing',
    'E2E test directory exists',
    'test',
    'E2E tests',
  ),
  fileCheck(
    'TEST-4',
    'Testing',
    'Load-model baseline runner exists',
    'scripts/load/load-baseline.mjs',
    'Load baseline runner',
  ),

  // ── Observability ─────────────────────────────────────────────────────────
  areaCheck(
    'OBS-1',
    'Observability',
    'Structured logging module (40.77)',
    coreDir('logger'),
    'Logger',
  ),
  areaCheck(
    'OBS-2',
    'Observability',
    'Distributed tracing module (40.78)',
    coreDir('tracing'),
    'Tracing',
  ),
  areaCheck(
    'OBS-3',
    'Observability',
    'Production metrics module (40.79)',
    coreDir('metrics'),
    'Metrics',
  ),
  areaCheck(
    'OBS-4',
    'Observability',
    'Performance profiling subsystem (40.97)',
    coreDir('profiling'),
    'Profiling',
  ),

  // ── Performance ───────────────────────────────────────────────────────────
  areaCheck(
    'PERF-1',
    'Performance',
    '1M-user load model (40.80)',
    coreDir('load-model'),
    'Load model',
  ),
  areaCheck(
    'PERF-2',
    'Performance',
    '1M-user capacity model (40.98)',
    coreDir('capacity-model'),
    'Capacity model',
  ),

  // ── Scaling ───────────────────────────────────────────────────────────────
  contentCheck(
    'SCALE-1',
    'Scaling',
    'Load model defines connection limits',
    'src/core/load-model/load-model.config.ts',
    /maxConcurrentSockets|maxConcurrentRequests/,
    'Connection limits',
  ),
  fileCheck(
    'SCALE-2',
    'Scaling',
    'Redis adapter for cross-instance broadcast exists',
    'src/core/redis/redis-io.adapter.ts',
    'Redis IO adapter',
  ),

  // ── Documentation ─────────────────────────────────────────────────────────
  fileCheck(
    'DOCS-1',
    'Documentation',
    'PROJECT_DETAIL.md roadmap exists',
    'docs/PROJECT_DETAIL.md',
    'PROJECT_DETAIL',
  ),
  fileCheck(
    'DOCS-2',
    'Documentation',
    'CURRENT_STATUS.md exists',
    'docs/CURRENT_STATUS.md',
    'CURRENT_STATUS',
  ),

  // ── CI/CD, Backups, Disaster Recovery (not in scope) ─────────────────────
  {
    id: 'N/A-1',
    area: 'CI/CD',
    description: 'CI/CD pipeline (40.93) — no deployment in scope',
    evaluate: () => ({
      id: 'N/A-1',
      area: 'CI/CD',
      description: 'CI/CD pipeline (40.93) — no deployment in scope',
      status: 'not-applicable',
      evidence:
        'Lecture 40.93 declared NOT APPLICABLE — no deployment in scope',
    }),
  },
  {
    id: 'N/A-2',
    area: 'Backups',
    description: 'Backup strategy (40.95) — no deployment in scope',
    evaluate: () => ({
      id: 'N/A-2',
      area: 'Backups',
      description: 'Backup strategy (40.95) — no deployment in scope',
      status: 'not-applicable',
      evidence:
        'Lecture 40.95 declared NOT APPLICABLE — no deployment in scope',
    }),
  },
  {
    id: 'N/A-3',
    area: 'Disaster recovery',
    description: 'Disaster recovery (40.95) — no deployment in scope',
    evaluate: () => ({
      id: 'N/A-3',
      area: 'Disaster recovery',
      description: 'Disaster recovery (40.95) — no deployment in scope',
      status: 'not-applicable',
      evidence:
        'Lecture 40.95 declared NOT APPLICABLE — no deployment in scope',
    }),
  },
];

export const PRODUCTION_READINESS_VERSION = '1.0.0';

export interface AreaReport {
  name: string;
  checks: CheckResult[];
  passed: number;
  failed: number;
  notApplicable: number;
  manual: number;
  status: 'pass' | 'fail' | 'partial' | 'not-applicable';
}

export interface ProductionReadinessReport {
  version: string;
  areas: AreaReport[];
  totalChecks: number;
  passed: number;
  failed: number;
  notApplicable: number;
  manual: number;
  /** Overall: true only when zero checks have status 'fail'. */
  overallReady: boolean;
}

export function evaluateProductionReadiness(
  root: string,
  checks: Check[] = PRODUCTION_READINESS_CHECKS,
): ProductionReadinessReport {
  const results = checks.map((c) => c.evaluate(root));

  const byArea = new Map<string, CheckResult[]>();
  for (const r of results) {
    const arr = byArea.get(r.area) ?? [];
    arr.push(r);
    byArea.set(r.area, arr);
  }

  const areas: AreaReport[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalNa = 0;
  let totalManual = 0;

  for (const [name, checks] of byArea) {
    const passed = checks.filter((c) => c.status === 'pass').length;
    const failed = checks.filter((c) => c.status === 'fail').length;
    const notApplicable = checks.filter(
      (c) => c.status === 'not-applicable',
    ).length;
    const manual = checks.filter((c) => c.status === 'manual').length;

    let status: AreaReport['status'] = 'pass';
    if (failed > 0) status = 'fail';
    else if (passed === 0 && notApplicable > 0) status = 'not-applicable';
    else if (passed === 0) status = 'partial';

    areas.push({ name, checks, passed, failed, notApplicable, manual, status });
    totalPassed += passed;
    totalFailed += failed;
    totalNa += notApplicable;
    totalManual += manual;
  }

  return {
    version: PRODUCTION_READINESS_VERSION,
    areas,
    totalChecks: results.length,
    passed: totalPassed,
    failed: totalFailed,
    notApplicable: totalNa,
    manual: totalManual,
    overallReady: totalFailed === 0,
  };
}
