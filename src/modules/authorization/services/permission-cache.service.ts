import { Injectable, OnModuleInit } from '@nestjs/common';

import { AuthorizationContext } from '../domain';

import {
  PERMISSION_INVALIDATE_CHANNEL,
  REDIS_TTL,
  redisKeys,
} from '../../../core/redis/redis-keys';
import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class PermissionCacheService implements OnModuleInit {
  private readonly memory = new Map<string, AuthorizationContext>();

  constructor(
    private readonly redis: RedisService,
    private readonly pubSub: RedisPubSubService,
  ) {}

  async onModuleInit() {
    await this.pubSub.subscribe<{ userId: string }>(
      PERMISSION_INVALIDATE_CHANNEL,
      ({ userId }) => {
        this.memory.delete(userId);
      },
    );
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
    const redisValue = await this.redis.get(redisKeys.permissionCache(userId));

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
      redisKeys.permissionCache(userId),
      JSON.stringify(context),
      REDIS_TTL.PERMISSION_CACHE,
    );
  }

  // =====================================================
  // Delete
  // =====================================================

  async delete(userId: string): Promise<void> {
    this.memory.delete(userId);

    await this.redis.del(redisKeys.permissionCache(userId));

    // Evict the in-memory copy on every instance so a revoked permission
    // cannot linger in a peer process until its TTL lapses.
    await this.pubSub.publish(PERMISSION_INVALIDATE_CHANNEL, { userId });
  }

  // =====================================================
  // Exists
  // =====================================================

  async exists(userId: string): Promise<boolean> {
    if (this.memory.has(userId)) {
      return true;
    }

    return this.redis.exists(redisKeys.permissionCache(userId));
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
