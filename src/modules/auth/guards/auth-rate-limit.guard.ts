import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import { AuthRateLimitService } from '../services/auth-rate-limit.service';

import {
  AUTH_RATE_LIMIT_KEY,
  AuthRateLimitTarget,
} from '../decorators/auth-rate-limit.decorator';

const LIMITS: Record<
  AuthRateLimitTarget,
  { limit: number; windowSeconds: number }
> = {
  login: { limit: 5, windowSeconds: 60 },
  register: { limit: 5, windowSeconds: 60 },
  refresh: { limit: 10, windowSeconds: 60 },
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: AuthRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const target = this.reflector.get<AuthRateLimitTarget>(
      AUTH_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!target) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const ip = request.ip ?? 'unknown';

    const identifier =
      (request.body as { identifier?: string } | undefined)?.identifier ??
      'unknown';

    const key =
      target === 'login'
        ? `auth:login:${identifier.toLowerCase()}:${ip}`
        : `auth:${target}:${ip}`;

    await this.rateLimiter.consume({
      key,
      limit: LIMITS[target].limit,
      windowSeconds: LIMITS[target].windowSeconds,
    });

    return true;
  }
}
