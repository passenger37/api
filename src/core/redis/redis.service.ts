import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = process.env.REDIS_PORT ?? '6379';
  const password = process.env.REDIS_PASSWORD;

  const authority = password ? `:${encodeURIComponent(password)}@` : '';

  const db = process.env.REDIS_DB ? `/${process.env.REDIS_DB}` : '';

  return `redis://${authority}${host}:${port}${db}`;
}

const MAX_INITIAL_RECONNECT_ATTEMPTS = 4;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private hadConnection = false;

  async onModuleInit() {
    this.client = createClient({
      url: resolveRedisUrl(),
      // Degradation contract: commands must fail loud (reject) while the
      // connection is down - callers fall through to their error paths
      // instead of queuing requests forever (an offline queue would hide
      // the outage behind an unbounded hang).
      disableOfflineQueue: true,
      socket: {
        // Bound the INITIAL connect so boot fails fast when Redis is
        // unreachable (previously node-redis retried forever and onModuleInit
        // never settled). After a session was ever established the strategy
        // stays unlimited so a mid-session outage auto-recovers.
        reconnectStrategy: (retries) => {
          if (!this.hadConnection && retries >= MAX_INITIAL_RECONNECT_ATTEMPTS) {
            return false;
          }
          return Math.min(2 ** retries * 100, 2000);
        },
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Error', err);
    });
    this.client.on('ready', () => {
      this.hadConnection = true;
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient() {
    return this.client;
  }

  /**
   * Resolve once the client is ready to serve commands (or reject on
   * timeout). Dependency providers run their onModuleInit hooks concurrently
   * with this service, so consumers doing their first write during boot must
   * await readiness instead of assuming the connect already completed.
   */
  async waitUntilReady(timeoutMs = 3000): Promise<void> {
    if (this.client.isReady) return;
    await Promise.race([
      new Promise<void>((resolve) => {
        this.client.once('ready', () => resolve());
      }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Redis not ready within timeout')),
          timeoutMs,
        );
      }),
    ]);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, {
        EX: ttlSeconds,
      });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string) {
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async decr(key: string) {
    return this.client.decr(key);
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }
}
