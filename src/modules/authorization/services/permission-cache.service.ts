import { Injectable } from '@nestjs/common';

import { AuthorizationContext } from '../domain';

import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class PermissionCacheService {
  private readonly memory = new Map<string, AuthorizationContext>();

  private readonly ttlSeconds = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  // =====================================================
  // Helpers
  // =====================================================

  private getKey(userId: string): string {
    return `authorization:user:${userId}`;
  }

  // =====================================================
  // Read
  // =====================================================

  async get(userId: string): Promise<AuthorizationContext | null> {
    // 1. Memory Cache
    const local = this.memory.get(userId);

    if (local) {
      return local;
    }

    // 2. Redis Cache
    const redisValue = await this.redis.get(this.getKey(userId));

    if (!redisValue) {
      return null;
    }

    const context = JSON.parse(redisValue) as AuthorizationContext;

    // Populate memory cache
    this.memory.set(userId, context);

    return context;
  }

  // =====================================================
  // Write
  // =====================================================

  async set(userId: string, context: AuthorizationContext): Promise<void> {
    // Memory
    this.memory.set(userId, context);

    // Redis
    await this.redis.set(
      this.getKey(userId),
      JSON.stringify(context),
      this.ttlSeconds,
    );
  }

  // =====================================================
  // Delete
  // =====================================================

  async delete(userId: string): Promise<void> {
    this.memory.delete(userId);

    await this.redis.del(this.getKey(userId));
  }

  // =====================================================
  // Exists
  // =====================================================

  async exists(userId: string): Promise<boolean> {
    if (this.memory.has(userId)) {
      return true;
    }

    return this.redis.exists(this.getKey(userId));
  }

  // =====================================================
  // Clear Local Cache
  // =====================================================

  async clear(): Promise<void> {
    this.memory.clear();

    // Intentionally does not flush Redis.
    // Redis entries expire automatically via TTL.
  }
}
