import { Injectable } from '@nestjs/common';

import { AuthorizationContext } from '../domain';

@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<string, AuthorizationContext>();

  get(userId: string): AuthorizationContext | null {
    return this.cache.get(userId) ?? null;
  }

  set(userId: string, context: AuthorizationContext): void {
    this.cache.set(userId, context);
  }

  remove(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}
