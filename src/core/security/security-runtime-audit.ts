import { ValidationPipeOptions } from '@nestjs/common';
import { ControlVerdict, SecurityArea } from './security-checklist';
import { VALIDATION_PIPE_OPTIONS } from '../../config/validation/validation.config';

/**
 * Runtime half of the 40.96 audit: checks that are only answerable against
 * live configuration (the global validation pipe, resolved JWT/session
 * config). Kept as pure functions so the audit service passes injected
 * config and the spec can mutate inputs to prove each check is real.
 */

export interface JwtRuntimeConfig {
  accessToken?: { secret?: string };
  refreshToken?: { secret?: string };
}

export interface SessionCookieRuntimeConfig {
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export interface RuntimeAuditContext {
  jwt?: JwtRuntimeConfig;
  sessionCookie?: SessionCookieRuntimeConfig;
  env: string;
}

function passed(
  id: string,
  area: SecurityArea,
  message: string,
): ControlVerdict {
  return { id, area, status: 'passed', evidence: [message], violations: [] };
}

function failed(
  id: string,
  area: SecurityArea,
  message: string,
): ControlVerdict {
  return { id, area, status: 'failed', evidence: [message], violations: [] };
}

/** Strictness of a validation pipe: whitelist + forbidNonWhitelisted (and forbidUnknownValues when available). */
export function validationStrictness(
  options: ValidationPipeOptions,
): ControlVerdict {
  const strict =
    options.whitelist === true &&
    options.forbidNonWhitelisted === true &&
    options.forbidUnknownValues !== false;
  return strict
    ? passed(
        'VAL-1',
        'validation',
        `Global pipe strict: whitelist=${String(options.whitelist)}, forbidNonWhitelisted=${String(options.forbidNonWhitelisted)}, forbidUnknownValues=${String(options.forbidUnknownValues)}`,
      )
    : failed(
        'VAL-1',
        'validation',
        'Global validation pipe is not strict (whitelist/forbidNonWhitelisted off)',
      );
}

/** JWT secrets resolved and not trivially short/defaulted. */
export function jwtRuntime(
  ctx: Pick<RuntimeAuditContext, 'jwt'>,
): ControlVerdict {
  const access = ctx.jwt?.accessToken?.secret;
  const refresh = ctx.jwt?.refreshToken?.secret;
  const accessOk = typeof access === 'string' && access.length >= 16;
  const refreshOk = typeof refresh === 'string' && refresh.length >= 16;
  return accessOk && refreshOk
    ? passed(
        'AUTH-2',
        'authentication',
        'JWT access + refresh secrets resolved from config (>= 16 chars)',
      )
    : failed(
        'AUTH-2',
        'authentication',
        accessOk
          ? 'JWT refresh secret missing or too short'
          : 'JWT access secret missing or too short',
      );
}

/** Session cookie hardening against the deployed environment. */
export function sessionCookieRuntime(
  ctx: Pick<RuntimeAuditContext, 'sessionCookie' | 'env'>,
): ControlVerdict {
  const cookie = ctx.sessionCookie;
  const httpOnly = cookie?.httpOnly === true;
  const sameSiteOk =
    cookie?.sameSite === 'lax' || cookie?.sameSite === 'strict';
  const productionSecureOk =
    ctx.env === 'production' ? cookie?.secure === true : true;
  return httpOnly && sameSiteOk && productionSecureOk
    ? passed(
        'AUTH-4',
        'authentication',
        `Session cookie hardened (httpOnly, sameSite=${String(cookie?.sameSite)}, secure=${String(cookie?.secure)})`,
      )
    : failed(
        'AUTH-4',
        'authentication',
        httpOnly && sameSiteOk
          ? 'Session cookie is not Secure in production'
          : 'Session cookie flags misconfigured (httpOnly/sameSite)',
      );
}

/** Run the full runtime control set against the given context (defaults to the live validation pipe). */
export function runRuntimeAudit(ctx: RuntimeAuditContext): ControlVerdict[] {
  return [
    validationStrictness(VALIDATION_PIPE_OPTIONS),
    jwtRuntime(ctx),
    sessionCookieRuntime(ctx),
  ];
}
