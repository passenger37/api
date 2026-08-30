import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class WebSocketConnectionLimitService {
  private readonly maxConnectionsPerUser = Number(
    process.env.WS_MAX_CONNECTIONS_PER_USER ?? 5,
  );

  private readonly ttlSeconds = 86_400;

  constructor(private readonly redis: RedisService) {}

  async acquire(userId: string): Promise<boolean> {
    const key = this.keyFor(userId);

    const count = await this.redis.incr(key);

    await this.redis.expire(key, this.ttlSeconds);

    if (count > this.maxConnectionsPerUser) {
      await this.redis.decr(key);

      return false;
    }

    return true;
  }

  async release(userId: string): Promise<void> {
    const key = this.keyFor(userId);

    const count = await this.redis.decr(key);

    if (count < 0) {
      await this.redis.set(key, '0', this.ttlSeconds);
    }
  }

  private keyFor(userId: string): string {
    return `ws:connections:${userId}`;
  }
}
