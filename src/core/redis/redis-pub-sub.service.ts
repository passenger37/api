import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisClientType } from 'redis';

import { RedisService } from './redis.service';

type Handler<T = unknown> = (payload: T) => void;

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private subscriber: RedisClientType | null = null;

  private readonly handlers = new Map<string, Set<Handler>>();

  constructor(private readonly redis: RedisService) {}

  async onModuleInit() {
    const client = this.redis.getClient().duplicate();

    this.subscriber = client;

    client.on('error', (err) => {
      console.error('Redis Pub/Sub error', err);
    });

    await client.connect();
  }

  async onModuleDestroy() {
    const client = this.subscriber;

    if (client) {
      await client.quit();
    }
  }

  async subscribe<T>(
    channel: string,
    handler: Handler<T>,
  ): Promise<() => void> {
    const prev = this.handlers.get(channel);

    if (!prev) {
      this.handlers.set(channel, new Set<Handler>());
    }

    this.handlers.get(channel)!.add(handler);

    if (!prev) {
      await this.subscriber?.subscribe(channel, (message) => {
        this.dispatch(channel, message);
      });
    }

    return () => {
      this.handlers.get(channel)?.delete(handler);

      if (this.handlers.get(channel)?.size === 0) {
        this.handlers.delete(channel);
        void this.subscriber?.unsubscribe(channel);
      }
    };
  }

  async publish<T>(channel: string, payload: T): Promise<void> {
    await this.redis.getClient().publish(channel, JSON.stringify(payload));
  }

  private dispatch(channel: string, message: string) {
    let payload: unknown = message;

    try {
      payload = JSON.parse(message);
    } catch {
      payload = message;
    }

    const handlers = this.handlers.get(channel);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }
}
