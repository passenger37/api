import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { redisKeys } from './redis-keys';
import { RedisService } from './redis.service';

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisLockService {
  constructor(private readonly redis: RedisService) {}

  async acquire(name: string, token: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis
      .getClient()
      .set(redisKeys.lock(name), token, { NX: true, PX: ttlMs });

    return result === 'OK';
  }

  async release(name: string, token: string): Promise<void> {
    await this.redis.getClient().eval(RELEASE_SCRIPT, {
      keys: [redisKeys.lock(name)],
      arguments: [token],
    });
  }

  /**
   * Runs the job only if no other instance holds the lock. Returns whether
   * the job was executed (false means another instance owns the lock).
   */
  async runExclusive<T>(
    name: string,
    ttlMs: number,
    job: () => Promise<T>,
  ): Promise<{ executed: boolean; result: T | null }> {
    const token = randomUUID();

    const acquired = await this.acquire(name, token, ttlMs);

    if (!acquired) {
      return { executed: false, result: null };
    }

    try {
      const result = await job();

      return { executed: true, result };
    } finally {
      await this.release(name, token);
    }
  }
}
