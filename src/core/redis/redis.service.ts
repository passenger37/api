import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: this.resolveUrl(),
    });

    this.client.on('error', (err) => {
      console.error('Redis Error', err);
    });

    await this.client.connect();
  }

  private resolveUrl(): string {
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

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient() {
    return this.client;
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
