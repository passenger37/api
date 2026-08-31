import { Injectable } from '@nestjs/common';

import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class WebSocketConnectionLimitService {
  private readonly maxConnectionsPerUser = Number(
    process.env.WS_MAX_CONNECTIONS_PER_USER ?? 5,
  );

  constructor(private readonly redis: RedisService) {}

  async acquire(userId: string): Promise<boolean> {
    const key = redisKeys.wsConnection(userId);

    const count = await this.redis.incr(key);

    await this.redis.expire(key, REDIS_TTL.CONNECTION_COUNTER);

    if (count > this.maxConnectionsPerUser) {
      await this.redis.decr(key);

      return false;
    }

    return true;
  }

  async release(userId: string): Promise<void> {
    const key = redisKeys.wsConnection(userId);

    const count = await this.redis.decr(key);

    if (count < 0) {
      await this.redis.set(key, '0', REDIS_TTL.CONNECTION_COUNTER);
    }
  }
}
