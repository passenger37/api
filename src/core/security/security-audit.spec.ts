import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidationPipeOptions } from '@nestjs/common';
import { SECURITY_CHECKLIST, SECURITY_AREAS } from './security-checklist';
import { auditSourceTree } from './security-source-audit';
import {
  jwtRuntime,
  runRuntimeAudit,
  sessionCookieRuntime,
  validationStrictness,
} from './security-runtime-audit';
import { mergeVerdicts, SecurityAuditService } from './security-audit.service';
import { SecurityAuditController } from './security-audit.controller';

const fakeConfig = {
  get(key: string): unknown {
    if (key === 'jwt') {
      return {
        accessToken: { secret: 'test-access-secret-0123456789' },
        refreshToken: { secret: 'test-refresh-secret-0123456789' },
      };
    }
    if (key === 'session') {
      return { cookie: { httpOnly: true, sameSite: 'lax', secure: false } };
    }
    return undefined;
  },
};

describe('40.96 Backend Security Audit', () => {
  it(`covers every B2 review area (${SECURITY_AREAS.length} areas)`, () => {
    expect(SECURITY_AREAS).toEqual([
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
    ]);
    expect(SECURITY_CHECKLIST.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(SECURITY_CHECKLIST.map((c) => c.id));
    expect(ids.size).toBe(SECURITY_CHECKLIST.length);
  });

  it('passes every source-tree control against the real codebase', () => {
    const verdicts = auditSourceTree(process.cwd());
    const failed = verdicts.filter((v) => v.status === 'failed');
    expect(failed).toEqual([]);
    // every source-side control must have produced a verdict
    const sourceIds = new Set(verdicts.map((v) => v.id));
    expect(sourceIds.size).toBeGreaterThanOrEqual(18);
  });

  it('passes every merged control (source + runtime) against real config', () => {
    const runtime = runRuntimeAudit({ env: 'test', ...fakeConfigRuntime() });
    const merged = mergeVerdicts([auditSourceTree(process.cwd()), runtime]);
    expect(merged.filter((v) => v.status === 'failed')).toEqual([]);
    expect(new Set(merged.map((v) => v.id)).size).toBe(
      SECURITY_CHECKLIST.length,
    );
  });

  describe('runtime verifiers are real (mutation coverage)', () => {
    it('validationStrictness rejects a lenient pipe', () => {
      const weak: ValidationPipeOptions = {
        whitelist: false,
        forbidNonWhitelisted: false,
      };
      expect(validationStrictness(weak).status).toBe('failed');
    });

    it('jwtRuntime rejects missing / short secrets', () => {
      expect(jwtRuntime({ jwt: {} }).status).toBe('failed');
      expect(
        jwtRuntime({
          jwt: {
            accessToken: { secret: 'short' },
            refreshToken: { secret: '0123456789abcdef' },
          },
        }).status,
      ).toBe('failed');
      expect(
        jwtRuntime({
          jwt: {
            accessToken: { secret: '0123456789abcdef' },
            refreshToken: { secret: '0123456789abcdef' },
          },
        }).status,
      ).toBe('passed');
    });

    it('sessionCookieRuntime requires Secure in production', () => {
      expect(
        sessionCookieRuntime({
          sessionCookie: {
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: false,
          },
          env: 'production',
        }).status,
      ).toBe('failed');
      expect(
        sessionCookieRuntime({
          sessionCookie: { httpOnly: true, sameSite: 'strict', secure: true },
          env: 'production',
        }).status,
      ).toBe('passed');
    });
  });

  describe('source scanner flags injected defects', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-sec-audit-'));
      fs.mkdirSync(path.join(tmp, 'src', 'config', 'jwt'), { recursive: true });
      fs.mkdirSync(path.join(tmp, 'src', 'core'), { recursive: true });
      fs.mkdirSync(
        path.join(tmp, 'src', 'modules', 'e2ee-transport', 'services'),
        { recursive: true },
      );
    });

    afterEach(() => {
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('flags a missing dependency-scan script', () => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: {} }),
      );
      fs.writeFileSync(
        path.join(tmp, 'src', 'health.ts'),
        'export const ok = true;\n',
      );
      const verdicts = auditSourceTree(tmp);
      expect(verdicts.find((v) => v.id === 'DEPS-1')?.status).toBe('failed');
      expect(verdicts.find((v) => v.id === 'SECRETS-1')?.status).toBe('passed');
    });

    it('flags a hardcoded credential literal', () => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { 'security:audit': 'npm audit' } }),
      );
      fs.writeFileSync(
        path.join(tmp, 'src', 'core', 'leak.ts'),
        `export const config = { apiKey: 'AKIAIOSFODNN7EXAMPLE1234' };\n`,
      );
      const verdicts = auditSourceTree(tmp);
      expect(verdicts.find((v) => v.id === 'SECRETS-1')?.status).toBe('failed');
    });

    it('flags a literal JWT secret in config', () => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { 'security:audit': 'npm audit' } }),
      );
      fs.writeFileSync(
        path.join(tmp, 'src', 'config', 'jwt', 'jwt.config.ts'),
        `export default { secret: 'committed-jwt-secret-0123456789' };\n`,
      );
      const verdicts = auditSourceTree(tmp);
      expect(verdicts.find((v) => v.id === 'AUTH-2')?.status).toBe('failed');
    });

    it('flags interpolated raw SQL', () => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { 'security:audit': 'npm audit' } }),
      );
      fs.writeFileSync(
        path.join(tmp, 'src', 'core', 'repo.ts'),
        'const q = client.$queryRawUnsafe(`SELECT * FROM t WHERE id = ${userInput}`);\n',
      );
      const verdicts = auditSourceTree(tmp);
      expect(verdicts.find((v) => v.id === 'SQL-1')?.status).toBe('failed');
    });

    it('recognises libsignal in an e2ee module', () => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { 'security:audit': 'npm audit' } }),
      );
      fs.writeFileSync(
        path.join(
          tmp,
          'src',
          'modules',
          'e2ee-transport',
          'services',
          'crypto.service.ts',
        ),
        `import { PublicKey } from '../../../core/crypto/libsignal-shim';\nexport const k = PublicKey;\n`,
      );
      const verdicts = auditSourceTree(tmp);
      expect(verdicts.find((v) => v.id === 'E2EE-1')?.status).toBe('passed');
    });
  });

  describe('service + controller summary', () => {
    it('service reports a passing audit against live config', () => {
      const service = new SecurityAuditService(
        fakeConfig as unknown as import('@nestjs/config').ConfigService,
      );
      const report = service.runAudit();
      expect(report.overall).toBe('passed');
      expect(report.areas).toHaveLength(SECURITY_AREAS.length);
      expect(report.failedControls).toEqual([]);
    });

    it('service downgrades the report when JWT secrets are weak', () => {
      const service = new SecurityAuditService({
        get(key: string) {
          if (key === 'jwt')
            return {
              accessToken: { secret: 'x' },
              refreshToken: { secret: 'y' },
            };
          if (key === 'session')
            return {
              cookie: { httpOnly: true, sameSite: 'lax', secure: false },
            };
          return undefined;
        },
      } as unknown as import('@nestjs/config').ConfigService);
      const report = service.runAudit();
      expect(report.overall).toBe('failed');
      expect(report.failedControls).toContain('AUTH-2');
    });

    it('controller exposes the summary shape (no raw control evidence)', () => {
      const controller = new SecurityAuditController({
        runAudit: () => ({
          overall: 'passed' as const,
          checkedAt: '2026-01-01T00:00:00.000Z',
          areas: SECURITY_AREAS.map((area) => ({
            area,
            total: 1,
            passed: 1,
            failed: 0,
          })),
          failedControls: [],
        }),
      } as unknown as SecurityAuditService);
      const body = controller.auditReport();
      expect(body.overall).toBe('passed');
      expect(body.areas).toHaveLength(SECURITY_AREAS.length);
      expect(body.failedControls).toEqual([]);
      expect('controls' in body).toBe(false);
      expect('evidence' in body).toBe(false);
    });
  });
});

function fakeConfigRuntime(): {
  jwt: { accessToken: { secret: string }; refreshToken: { secret: string } };
  sessionCookie: {
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    secure: boolean;
  };
} {
  return {
    jwt: {
      accessToken: { secret: 'test-access-secret-0123456789' },
      refreshToken: { secret: 'test-refresh-secret-0123456789' },
    },
    sessionCookie: { httpOnly: true, sameSite: 'lax', secure: false },
  };
}
