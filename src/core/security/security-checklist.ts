/**
 * Lecture 40.96 — Backend Security Audit (B2 40.86).
 *
 * The authoritative audit checklist. Every B2 review area (authentication,
 * authorization, validation, sql, redis, websockets, uploads, logging,
 * secrets, dependencies, e2ee) is mapped to enforceable controls. Each
 * control is evaluated by the source-tree scanner (static invariants) and/or
 * the runtime verifier (live configuration). A control only ever ends up
 * `passed` when every evaluation of it passes, so loosening a config flag or
 * introducing a credential literal into `src/` fails the audit.
 */

export const SECURITY_AREAS = [
  'authentication',
  'authorization',
  'validation',
  'sql',
  'redis',
  'websockets',
  'uploads',
  'logging',
  'secrets',
  'dependencies',
  'e2ee',
] as const;

export type SecurityArea = (typeof SECURITY_AREAS)[number];

export interface SecurityControl {
  id: string;
  area: SecurityArea;
  requirement: string;
  rationale: string;
}

export const SECURITY_CHECKLIST: SecurityControl[] = [
  {
    id: 'AUTH-1',
    area: 'authentication',
    requirement: 'Passwords are stored as salted bcrypt hashes (cost >= 10).',
    rationale:
      'Plaintext or weak one-way digests for credentials are a release blocker.',
  },
  {
    id: 'AUTH-2',
    area: 'authentication',
    requirement:
      'JWT signing secrets come from the environment, never code literals.',
    rationale:
      'A committed secret is a forgery primitive for any session token.',
  },
  {
    id: 'AUTH-3',
    area: 'authentication',
    requirement: 'Authentication endpoints are rate limited.',
    rationale: 'Unthrottled login/refresh surfaces enable credential stuffing.',
  },
  {
    id: 'AUTH-4',
    area: 'authentication',
    requirement:
      'Session cookie is hardened (HttpOnly + SameSite, Secure in production).',
    rationale:
      'Misset cookie flags expose the session to XSS/cross-site requests.',
  },
  {
    id: 'AUTHZ-1',
    area: 'authorization',
    requirement:
      'RBAC/permission/resource-owner guards are enforced on routes.',
    rationale: 'Authorization bugs outrank most others in blast radius.',
  },
  {
    id: 'AUTHZ-2',
    area: 'authorization',
    requirement:
      'Permission resolution flows through a dedicated authorization layer.',
    rationale: 'Ad-hoc inline checks are easy to skip on a new route.',
  },
  {
    id: 'VAL-1',
    area: 'validation',
    requirement:
      'Global validation is strict (whitelist + forbid non-whitelisted).',
    rationale:
      'Lenient pipes silently drop the strongest mass-assignment protection.',
  },
  {
    id: 'VAL-2',
    area: 'validation',
    requirement:
      'No untyped request input (`any` body/query/param) in controllers.',
    rationale: 'Untyped input bypasses DTO-driven allowlists on that route.',
  },
  {
    id: 'SQL-1',
    area: 'sql',
    requirement:
      'Raw SQL never interpolates runtime values into the query text.',
    rationale: 'String-interpolated SQL is the classic injection path.',
  },
  {
    id: 'REDIS-1',
    area: 'redis',
    requirement: 'No Redis connection URLs with embedded credentials in code.',
    rationale:
      'A Redis connection string that embeds user:pass@host leaks the store password.',
  },
  {
    id: 'REDIS-2',
    area: 'redis',
    requirement:
      'Redis must fail fast at boot and fail loud at runtime during outages.',
    rationale:
      'An infinite reconnect + offline queue hides outages behind hangs (fixed at 40.90).',
  },
  {
    id: 'WS-1',
    area: 'websockets',
    requirement: 'WebSocket handshakes authenticate (JWT) before room access.',
    rationale: 'Unauthenticated WS join bypasses the HTTP guard layer.',
  },
  {
    id: 'WS-2',
    area: 'websockets',
    requirement:
      'WebSocket errors are emitted through a sanitised error frame.',
    rationale: 'Raw internal errors can leak stack traces/database fragments.',
  },
  {
    id: 'UPLOAD-1',
    area: 'uploads',
    requirement: 'Uploads are validated against an explicit MIME allow-list.',
    rationale: 'An open MIME policy permits executable/weaponised content.',
  },
  {
    id: 'UPLOAD-2',
    area: 'uploads',
    requirement: 'Uploads enforce a per-type size cap.',
    rationale: 'Unbounded upload size is a storage/DoS primitive.',
  },
  {
    id: 'LOG-1',
    area: 'logging',
    requirement:
      'Logs redact authorization material (tokens, passwords, cookies).',
    rationale: 'Plaintext credentials in logs defeat every other control.',
  },
  {
    id: 'SECRETS-1',
    area: 'secrets',
    requirement:
      'No credential literals (passwords, secrets, keys, tokens) in source.',
    rationale:
      'Hardcoded credentials are the fastest way a repo read becomes a breach.',
  },
  {
    id: 'SECRETS-2',
    area: 'secrets',
    requirement:
      'Configuration is environment-driven (`process.env` behind config files).',
    rationale:
      'Env-driven config keeps deployments free of source changes and secrets.',
  },
  {
    id: 'DEPS-1',
    area: 'dependencies',
    requirement:
      'A dependency vulnerability scan (`security:audit`) is wired in.',
    rationale:
      'Without a scanner, published CVE fixes never surface to the repo.',
  },
  {
    id: 'E2EE-1',
    area: 'e2ee',
    requirement:
      'End-to-end encryption uses the audited libsignal ratchet/session crypto.',
    rationale:
      'Rolling bespoke crypto is out; libsignal is the audited primitive.',
  },
  {
    id: 'E2EE-2',
    area: 'e2ee',
    requirement:
      'Identity verification uses libsignal safety numbers (fingerprints).',
    rationale: 'TOFU without registered fingerprinting cannot surface MITM.',
  },
];

export type VerdictStatus = 'passed' | 'failed' | 'skipped';

export interface ControlVerdict {
  id: string;
  area: SecurityArea;
  status: VerdictStatus;
  evidence: string[];
  violations: string[];
}
