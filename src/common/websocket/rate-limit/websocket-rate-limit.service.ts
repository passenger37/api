import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

export interface WebSocketRateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

@Injectable()
export class WebSocketRateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(options: WebSocketRateLimitOptions): Promise<void> {
    const current = await this.redis.incr(options.key);

    if (current === 1) {
      await this.redis.expire(options.key, options.windowSeconds);
    }

    if (current > options.limit) {
      throw new HttpException(
        'Too many WebSocket requests. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
