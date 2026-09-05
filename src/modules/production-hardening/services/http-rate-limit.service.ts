import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

export interface HttpRateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

@Injectable()
export class HttpRateLimitService {
  private readonly keyPrefix = 'http:ratelimit:';

  constructor(private readonly redis: RedisService) {}

  async consume(options: HttpRateLimitOptions): Promise<RateLimitInfo> {
    const fullKey = `${this.keyPrefix}${options.key}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - options.windowSeconds;

    const client = this.redis.getClient();

    const pipeline = client.multi();
    
    pipeline.zRemRangeByScore(fullKey, 0, windowStart);
    pipeline.zCard(fullKey);
    pipeline.zAdd(fullKey, { score: now, value: `${now}:${Math.random()}` });
    pipeline.expire(fullKey, options.windowSeconds);
    
    const results = await pipeline.exec();
    const currentCount = (results?.[1] as unknown as number) ?? 0;

    const remaining = Math.max(0, options.limit - currentCount - 1);
    const resetAt = now + options.windowSeconds;

    if (currentCount >= options.limit) {
      throw new HttpException(
        {
          message: 'Too many requests. Please slow down.',
          limit: options.limit,
          remaining: 0,
          resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      limit: options.limit,
      remaining,
      resetAt,
    };
  }

  async getInfo(key: string, windowSeconds: number) {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const client = this.redis.getClient();
    await client.zRemRangeByScore(fullKey, 0, windowStart);
    const count = await client.zCard(fullKey);

    return {
      limit: 0,
      remaining: Math.max(0, -count),
      resetAt: now + windowSeconds,
    };
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.redis.del(fullKey);
  }
}