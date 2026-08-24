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
    const client = this.redis.getClient();

    const current = await client.incr(options.key);

    if (current === 1) {
      await client.expire(options.key, options.windowSeconds);
    }

    if (current > options.limit) {
      throw new HttpException(
        'Too many WebSocket requests. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
