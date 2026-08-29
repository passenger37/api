import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

const TYPING_TTL_SECONDS = 10;

@Injectable()
export class TypingService {
  constructor(private readonly redis: RedisService) {}

  async startTyping(channelId: string, userId: string): Promise<void> {
    await this.redis.set(
      this.presenceKey(channelId, userId),
      '1',
      TYPING_TTL_SECONDS,
    );
  }

  async stopTyping(channelId: string, userId: string): Promise<void> {
    await this.redis.del(this.presenceKey(channelId, userId));
  }

  private presenceKey(channelId: string, userId: string) {
    return `typing:${channelId}:${userId}`;
  }
}
