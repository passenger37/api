import { Injectable } from '@nestjs/common';

import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
import { RedisService } from '../../../core/redis/redis.service';
import { RealtimeTypingState } from '../types/realtime.types';
import { serializeTypingState } from '../mappers/realtime.mapper';

@Injectable()
export class RealtimeTypingService {
  constructor(private readonly redis: RedisService) {}

  async startTyping(
    channelId: string,
    userId: string,
  ): Promise<RealtimeTypingState> {
    await this.redis.set(
      redisKeys.typing(channelId, userId),
      String(Date.now()),
      REDIS_TTL.TYPING,
    );

    return serializeTypingState({ channelId, userId });
  }

  async stopTyping(
    channelId: string,
    userId: string,
  ): Promise<RealtimeTypingState> {
    await this.redis.del(redisKeys.typing(channelId, userId));

    return serializeTypingState({ channelId, userId });
  }

  async isTyping(channelId: string, userId: string): Promise<boolean> {
    return this.redis.exists(redisKeys.typing(channelId, userId));
  }
}
