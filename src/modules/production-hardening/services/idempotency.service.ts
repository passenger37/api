import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

export interface IdempotencyOptions {
  key: string;
  ttlSeconds: number;
  lockValue?: string;
}

export interface IdempotencyResult {
  isFirstRequest: boolean;
  existingResult?: unknown;
}

@Injectable()
export class IdempotencyService {
  private readonly keyPrefix = 'idempotency:';

  constructor(private readonly redis: RedisService) {}

  async checkAndMark(options: IdempotencyOptions): Promise<IdempotencyResult> {
    const fullKey = `${this.keyPrefix}${options.key}`;
    const ttl = options.ttlSeconds;

    const existing = await this.redis.get(fullKey);

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        return { isFirstRequest: false, existingResult: parsed };
      } catch {
        return { isFirstRequest: false, existingResult: existing };
      }
    }

    const lockValue = options.lockValue ?? 'processing';
    await this.redis.set(fullKey, lockValue, ttl);

    return { isFirstRequest: true };
  }

  async storeResult(
    key: string,
    result: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.redis.set(fullKey, JSON.stringify(result), ttlSeconds);
  }

  async getResult(key: string): Promise<unknown | null> {
    const fullKey = `${this.keyPrefix}${key}`;
    const value = await this.redis.get(fullKey);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.redis.del(fullKey);
  }
}
