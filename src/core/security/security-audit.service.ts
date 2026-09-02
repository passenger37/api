import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ControlVerdict,
  SECURITY_AREAS,
  SecurityArea,
} from './security-checklist';
import { auditSourceTree } from './security-source-audit';
import {
  JwtRuntimeConfig,
  runRuntimeAudit,
  RuntimeAuditContext,
  SessionCookieRuntimeConfig,
} from './security-runtime-audit';

export interface AuditAreaSummary {
  area: SecurityArea;
  total: number;
  passed: number;
  failed: number;
}

export interface SecurityAuditReport {
  overall: 'passed' | 'failed';
  checkedAt: string;
  areas: AuditAreaSummary[];
  failedControls: string[];
  controls: ControlVerdict[];
}

/** Merge source + runtime verdicts per control id (a control passes only when every evaluation passes). */
export function mergeVerdicts(
  evaluations: ControlVerdict[][],
): ControlVerdict[] {
  const byId = new Map<string, ControlVerdict[]>();
  for (const list of evaluations) {
    for (const v of list) {
      const bucket = byId.get(v.id) ?? [];
      bucket.push(v);
      byId.set(v.id, bucket);
    }
  }

  const merged: ControlVerdict[] = [];
  for (const [id, bucket] of byId) {
    const area = bucket[0].area;
    const evidence: string[] = [];
    const violations: string[] = [];
    let status: ControlVerdict['status'] = 'passed';
    for (const v of bucket) {
      evidence.push(...v.evidence);
      violations.push(...v.violations);
      if (v.status === 'failed') status = 'failed';
      else if (v.status === 'skipped' && status === 'passed')
        status = 'skipped';
    }
    merged.push({ id, area, status, evidence, violations });
  }
  return merged;
}

@Injectable()
export class SecurityAuditService {
  constructor(private readonly config: ConfigService) {}

  private typed<T>(key: string, fallback: T): T {
    return this.config.get(key, fallback);
  }

  /**
   * 40.96 Backend Security Audit — one-shot evaluation:
   *  - source-tree scan for the static controls (bcrypt, env-driven JWT
   *    secrets, guard wiring, parameterised SQL, MIME/size allow-lists,
   *    redaction, secret hygiene, dependency-scan wiring, libsignal), plus
   *  - runtime configuration checks (global validation pipe, JWT/session
   *    config). A control passes only when every evaluation of it passes.
   */
  runAudit(): SecurityAuditReport {
    const sourceRoot = process.cwd();
    const sourceVerdicts = auditSourceTree(sourceRoot);

    const jwt = this.typed<JwtRuntimeConfig>('jwt', {});
    const session = this.typed<
      { cookie?: SessionCookieRuntimeConfig } | undefined
    >('session', undefined);
    const ctx: RuntimeAuditContext = {
      jwt,
      sessionCookie: session?.cookie,
      env: process.env.NODE_ENV ?? 'development',
    };
    const runtimeVerdicts = runRuntimeAudit(ctx);

    const merged = mergeVerdicts([sourceVerdicts, runtimeVerdicts]);
    const failedControls = merged
      .filter((v) => v.status === 'failed')
      .map((v) => v.id);
    const areas: AuditAreaSummary[] = SECURITY_AREAS.map((area) => {
      const controls = merged.filter((v) => v.area === area);
      return {
        area,
        total: controls.length,
        passed: controls.filter((v) => v.status === 'passed').length,
        failed: controls.filter((v) => v.status === 'failed').length,
      };
    });

    return {
      overall: failedControls.length > 0 ? 'failed' : 'passed',
      checkedAt: new Date().toISOString(),
      areas,
      failedControls,
      controls: merged,
    };
  }
}
