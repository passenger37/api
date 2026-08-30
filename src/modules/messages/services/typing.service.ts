import { Injectable } from '@nestjs/common';

import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class TypingService {
  constructor(private readonly redis: RedisService) {}

  async startTyping(channelId: string, userId: string): Promise<void> {
    await this.redis.set(
      redisKeys.typing(channelId, userId),
      '1',
      REDIS_TTL.TYPING,
    );
  }

  async stopTyping(channelId: string, userId: string): Promise<void> {
    await this.redis.del(redisKeys.typing(channelId, userId));
  }
}
