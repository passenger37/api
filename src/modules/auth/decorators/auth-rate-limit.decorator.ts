import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_KEY = 'auth_rate_limit';

export type AuthRateLimitTarget = 'login' | 'register' | 'refresh';

export const AuthRateLimit = (target: AuthRateLimitTarget) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, target);
