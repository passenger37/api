import * as fs from 'node:fs';
import * as path from 'node:path';
import { ControlVerdict, SECURITY_CHECKLIST } from './security-checklist';

interface SourceFile {
  rel: string;
  text: string;
}

/** True when `text` contains any of the given substrings. */
function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

/** True when the file path list contains a path ending with the given basename. */
function hasFile(files: SourceFile[], basename: string): boolean {
  return files.some((f) => f.rel.endsWith(`/${basename}`));
}

function ok(
  control: (typeof SECURITY_CHECKLIST)[number],
  evidence: string[],
): ControlVerdict {
  return {
    id: control.id,
    area: control.area,
    status: 'passed',
    evidence,
    violations: [],
  };
}

function fail(
  control: (typeof SECURITY_CHECKLIST)[number],
  message: string,
  violations: string[] = [],
): ControlVerdict {
  return {
    id: control.id,
    area: control.area,
    status: 'failed',
    evidence: [message],
    violations,
  };
}

function skip(control: (typeof SECURITY_CHECKLIST)[number]): ControlVerdict {
  return {
    id: control.id,
    area: control.area,
    status: 'skipped',
    evidence: ['Source tree unavailable'],
    violations: [],
  };
}

const CHECKLIST_BY_ID = new Map(SECURITY_CHECKLIST.map((c) => [c.id, c]));

const RE_CREDENTIAL_LITERAL =
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|jwt[_-]?secret|session[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i;

/** Collect the SourceFile[] work set: `src/**\/*.ts` minus specs, mocks and the testing tree. */
function collectSourceFiles(root: string): SourceFile[] {
  const out: SourceFile[] = [];
  const srcRoot = path.join(root, 'src');
  if (!fs.existsSync(srcRoot)) return out;

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'testing') continue;
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        const rel = path.relative(root, abs).split(path.sep).join('/');
        if (rel.endsWith('.spec.ts') || rel.endsWith('.d.ts')) continue;
        out.push({ rel, text: fs.readFileSync(abs, 'utf8') });
      }
    }
  };

  walk(srcRoot);
  return out;
}

function sourceCheck(
  root: string,
  files: SourceFile[],
  node: (typeof SECURITY_CHECKLIST)[number],
  evaluate: (files: SourceFile[]) => {
    passed: boolean;
    message: string;
    violations: string[];
  },
): ControlVerdict {
  if (!fs.existsSync(path.join(root, 'src'))) return skip(node);
  const outcome = evaluate(files);
  return outcome.passed
    ? ok(node, [outcome.message])
    : fail(node, outcome.message, outcome.violations);
}

function evaluateSourceAudit(root: string): ControlVerdict[] {
  const files = collectSourceFiles(root);
  const verdicts: ControlVerdict[] = [];

  const audit = (
    id: string,
    evaluate: (files: SourceFile[]) => {
      passed: boolean;
      message: string;
      violations: string[];
    },
  ) => {
    const node = CHECKLIST_BY_ID.get(id);
    if (node) verdicts.push(sourceCheck(root, files, node, evaluate));
  };

  // AUTH-1 passwords-hashed
  audit('AUTH-1', (f) => {
    const authFiles = f.filter((x) => x.rel.startsWith('src/modules/auth/'));
    const hits = authFiles.filter(
      (x) =>
        /from 'bcrypt'|require\(['"]bcrypt['"]\)/.test(x.text) &&
        /bcrypt\.hash\(\s*[^,]+?,\s*(1[0-9]|[2-9][0-9])\s*\)/.test(x.text),
    );
    return hits.length > 0
      ? {
          passed: true,
          message: `bcrypt hashing with cost >= 10 in ${hits.map((h) => h.rel).join(', ')}`,
          violations: [],
        }
      : {
          passed: false,
          message: 'No bcrypt hash (cost >= 10) found in src/modules/auth',
          violations: [],
        };
  });

  // AUTH-2 jwt-secrets-env
  audit('AUTH-2', (f) => {
    const cfg = f.find((x) => x.rel === 'src/config/jwt/jwt.config.ts');
    if (!cfg)
      return {
        passed: false,
        message: 'src/config/jwt/jwt.config.ts missing',
        violations: [],
      };
    const hasEnvAccess =
      cfg.text.includes('JWT_ACCESS_SECRET') &&
      cfg.text.includes('JWT_REFRESH_SECRET');
    const hasLiteral = /secret\s*:\s*['"][^'"]{6,}['"]/.test(cfg.text);
    return hasEnvAccess && !hasLiteral
      ? {
          passed: true,
          message:
            'JWT secrets read from process.env (JWT_ACCESS_SECRET/JWT_REFRESH_SECRET), no literal fallback',
          violations: [],
        }
      : {
          passed: false,
          message: hasLiteral
            ? 'JWT config carries a literal secret'
            : 'JWT config is not reading both env secrets',
          violations: [cfg.rel],
        };
  });

  // AUTH-3 auth-rate-limit
  audit('AUTH-3', (f) => {
    const guard = hasFile(f, 'auth-rate-limit.guard.ts');
    return guard
      ? {
          passed: true,
          message: 'auth-rate-limit.guard.ts present (throttled auth surface)',
          violations: [],
        }
      : {
          passed: false,
          message: 'auth-rate-limit.guard.ts missing',
          violations: [],
        };
  });

  // AUTHZ-1 guards-wired
  audit('AUTHZ-1', (f) => {
    const guards = [
      'roles.guard.ts',
      'permissions.guard.ts',
      'resource-owner.guard.ts',
      'super-admin.guard.ts',
    ];
    const missing = guards.filter((g) => !hasFile(f, g));
    return missing.length === 0
      ? {
          passed: true,
          message: `RBAC guards present: ${guards.join(', ')}`,
          violations: [],
        }
      : {
          passed: false,
          message: `Missing guards: ${missing.join(', ')}`,
          violations: missing,
        };
  });

  // AUTHZ-2 permission-resolver
  audit('AUTHZ-2', (f) => {
    const hasAuthorizationModule = f.some((x) =>
      x.rel.startsWith('src/modules/authorization/'),
    );
    const hasServerPermissionGuard = hasFile(f, 'server-permission.guard.ts');
    return hasAuthorizationModule && hasServerPermissionGuard
      ? {
          passed: true,
          message: 'authorization module + server-permission.guard.ts present',
          violations: [],
        }
      : {
          passed: false,
          message:
            'authorization module and/or server-permission guard missing',
          violations: [],
        };
  });

  // AUTHZ-3? not used.

  // VAL-2 no-untyped-input
  audit('VAL-2', (f) => {
    const controllers = f.filter((x) => x.rel.endsWith('.controller.ts'));
    const violations: string[] = [];
    for (const c of controllers) {
      // Only the parameter owned by the Body/Query/Param decorator (a
      // following identifier + `: any`) is a violation; `@CurrentUser() user: any`
      // style decorators are not inbound request payload.
      const re =
        /@(Body|Query|Param)\([^)]*\)\s*([a-zA-Z_$][\w$]*)\s*:\s*any\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(c.text)) !== null) {
        violations.push(`${c.rel}:${m[0].slice(0, 120)}`);
      }
    }
    return violations.length === 0
      ? {
          passed: true,
          message: 'No untyped request input in controllers',
          violations: [],
        }
      : { passed: false, message: 'Untyped request input found', violations };
  });

  // SQL-1 parameterized-raw
  audit('SQL-1', (f) => {
    const violations: string[] = [];
    for (const file of f) {
      const re = /\$(?:execute|query)RawUnsafe(\(|`)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(file.text)) !== null) {
        const delimiter = m[1];
        const start = m.index + m[0].length;
        const window = file.text.slice(start, start + 500);
        if (delimiter === '`') {
          const closing = window.indexOf('`');
          const body = closing >= 0 ? window.slice(0, closing) : window;
          if (body.includes('${')) {
            violations.push(`${file.rel} (interpolated tagged raw SQL)`);
          }
        } else if (window.includes('${')) {
          violations.push(`${file.rel} (interpolated raw SQL)`);
        }
      }
    }
    return violations.length === 0
      ? {
          passed: true,
          message:
            'No runtime-value interpolation in raw SQL ($executeRawUnsafe/$queryRawUnsafe)',
          violations: [],
        }
      : {
          passed: false,
          message: 'Raw SQL interpolation detected',
          violations,
        };
  });

  // REDIS-1 no-embedded-creds
  audit('REDIS-1', (f) => {
    const violations = f
      .filter((x) => /redis:\/\/[^'\s]*@/.test(x.text))
      .map((x) => x.rel);
    return violations.length === 0
      ? {
          passed: true,
          message: 'No credentialed redis:// URLs in source',
          violations: [],
        }
      : {
          passed: false,
          message: 'Credentialed Redis URLs embedded in code',
          violations,
        };
  });

  // REDIS-2 fail-loud
  audit('REDIS-2', (f) => {
    const svc = f.find((x) => x.rel === 'src/core/redis/redis.service.ts');
    if (!svc)
      return {
        passed: false,
        message: 'redis.service.ts missing',
        violations: [],
      };
    const failLoud = svc.text.includes('disableOfflineQueue: true');
    const failFast = svc.text.includes('MAX_INITIAL_RECONNECT_ATTEMPTS');
    return failLoud && failFast
      ? {
          passed: true,
          message:
            'disableOfflineQueue: true + bounded initial reconnect (MAX_INITIAL_RECONNECT_ATTEMPTS)',
          violations: [],
        }
      : {
          passed: false,
          message:
            'Redis degrade contract missing (fail-loud / bounded reconnect)',
          violations: [svc.rel],
        };
  });

  // WS-1 handshake-auth
  audit('WS-1', (f) => {
    const guard = hasFile(f, 'websocket-jwt.guard.ts');
    return guard
      ? {
          passed: true,
          message: 'WebSocket JWT handshake guard present',
          violations: [],
        }
      : {
          passed: false,
          message: 'websocket-jwt.guard.ts missing',
          violations: [],
        };
  });

  // WS-2 error-envelope
  audit('WS-2', (f) => {
    const normalizer = hasFile(f, 'websocket-error.normalizer.ts');
    return normalizer
      ? {
          passed: true,
          message:
            'websocket-error.normalizer.ts present (sanitised WS error frames)',
          violations: [],
        }
      : {
          passed: false,
          message: 'websocket-error.normalizer.ts missing',
          violations: [],
        };
  });

  // UPLOAD-1 mime-allowlist
  audit('UPLOAD-1', (f) => {
    const svc = f.find((x) =>
      x.rel.endsWith('messages/services/attachment-validation.service.ts'),
    );
    if (!svc)
      return {
        passed: false,
        message: 'attachment-validation.service.ts missing',
        violations: [],
      };
    const hasAllowlist =
      svc.text.includes('ALLOWED_MIME_TYPES') &&
      svc.text.includes('validateUploadPolicy');
    return hasAllowlist
      ? {
          passed: true,
          message:
            'AttachmentValidationService.ALLOWED_MIME_TYPES allow-list + validateUploadPolicy',
          violations: [],
        }
      : {
          passed: false,
          message: 'MIME allow-list validation missing',
          violations: [svc.rel],
        };
  });

  // UPLOAD-2 size-limit
  audit('UPLOAD-2', (f) => {
    const svc = f.find((x) =>
      x.rel.endsWith('messages/services/attachment-validation.service.ts'),
    );
    if (!svc)
      return {
        passed: false,
        message: 'attachment-validation.service.ts missing',
        violations: [],
      };
    const hasSizeCap = /\d+\s*\*\s*1024\s*\*\s*1024/.test(svc.text);
    return hasSizeCap
      ? {
          passed: true,
          message: 'Per-mime byte caps enforced (e.g. 10 * 1024 * 1024)',
          violations: [],
        }
      : {
          passed: false,
          message: 'No byte-size cap in upload validation',
          violations: [svc.rel],
        };
  });

  // LOG-1 redaction
  audit('LOG-1', (f) => {
    const loggerFiles = f.filter((x) => x.rel.startsWith('src/core/logger/'));
    const redacted = loggerFiles.some(
      (x) => x.text.includes('redact') && x.text.includes('paths'),
    );
    return redacted
      ? {
          passed: true,
          message:
            'Logger redact config present (redact.paths in src/core/logger)',
          violations: [],
        }
      : {
          passed: false,
          message: 'No log redaction configuration found in src/core/logger',
          violations: loggerFiles.map((x) => x.rel),
        };
  });

  // SECRETS-1 no-credential-literals
  audit('SECRETS-1', (f) => {
    const violations: string[] = [];
    for (const file of f) {
      if (file.rel.startsWith('src/testing/')) continue;
      const lines = file.text.split('\n');
      lines.forEach((line, i) => {
        if (RE_CREDENTIAL_LITERAL.test(line))
          violations.push(`${file.rel}:${i + 1}`);
      });
    }
    return violations.length === 0
      ? {
          passed: true,
          message: 'No hardcoded credential literals in source',
          violations: [],
        }
      : {
          passed: false,
          message: 'Credential literals detected in source',
          violations,
        };
  });

  // SECRETS-2 env-driver-config
  audit('SECRETS-2', (f) => {
    const credentialBearing = [
      'src/config/jwt/jwt.config.ts',
      'src/config/session/session.config.ts',
      'src/config/database/database.config.ts',
      'src/config/redis/redis.config.ts',
      'src/config/storage/storage.config.ts',
    ];
    const offenders: string[] = [];
    const present: string[] = [];
    for (const rel of credentialBearing) {
      const cfg = f.find((x) => x.rel === rel);
      if (!cfg) continue;
      present.push(rel);
      if (!cfg.text.includes('process.env')) offenders.push(rel);
    }
    return offenders.length === 0
      ? {
          passed: true,
          message: `Credential-bearing configs read process.env: ${present.join(', ')}`,
          violations: [],
        }
      : {
          passed: false,
          message: 'Credential-bearing configs are not environment-driven',
          violations: offenders,
        };
  });

  // DEPS-1 dependency scan wired
  {
    const node = CHECKLIST_BY_ID.get('DEPS-1')!;
    const pkgPath = path.join(root, 'package.json');
    let passed = false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
        scripts?: Record<string, string>;
      };
      passed = typeof pkg.scripts?.['security:audit'] === 'string';
    } catch {
      passed = false;
    }
    verdicts.push(
      passed
        ? ok(node, [
            'package.json scripts.security:audit (dependency scan) configured',
          ])
        : fail(
            node,
            'package.json is missing the security:audit dependency-scan script',
            ['package.json'],
          ),
    );
  }

  // E2EE-1 libsignal-session-crypto
  audit('E2EE-1', (f) => {
    const e2ee = f.filter((x) => x.rel.startsWith('src/modules/e2ee'));
    const sig = e2ee
      .filter((x) => x.text.includes('@signalapp/libsignal-client'))
      .map((x) => x.rel);
    return sig.length > 0
      ? {
          passed: true,
          message: `libsignal wired in ${sig.length} e2ee module file(s)`,
          violations: [],
        }
      : {
          passed: false,
          message: 'No @signalapp/libsignal-client usage in src/modules/e2ee*',
          violations: [],
        };
  });

  // E2EE-2 safety-number
  audit('E2EE-2', (f) => {
    const svc = f.find((x) =>
      x.rel.endsWith('e2ee-devices/services/e2ee-safety-number.service.ts'),
    );
    const usesFingerprint =
      svc && includesAny(svc.text, ['Fingerprint', 'PublicKey']);
    return usesFingerprint
      ? {
          passed: true,
          message:
            'e2ee-safety-number.service.ts uses libsignal Fingerprint/PublicKey',
          violations: [],
        }
      : {
          passed: false,
          message: 'Safety-number verification via libsignal missing',
          violations: svc ? [svc.rel] : [],
        };
  });

  return verdicts;
}

/**
 * Static, source-tree half of the 40.96 audit (the review areas that are
 * structural facts: bcrypt hashing, env-driven JWT secrets, guard wiring,
 * parameterized SQL, MIME/size allow-lists, redaction, secret hygiene,
 * dependency-scan wiring, libsignal usage). Pure node — no Nest imports — so
 * both the runtime service and the standalone `security:code` script reuse it.
 */
export function auditSourceTree(projectRoot: string): ControlVerdict[] {
  return evaluateSourceAudit(projectRoot);
}
