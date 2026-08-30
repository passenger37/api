import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { ServerOptions } from 'socket.io';

import { resolveRedisUrl } from './redis.service';
import { redisKeys } from './redis-keys';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(): Promise<void> {
    const pubClient: RedisClientType = createClient({
      url: resolveRedisUrl(),
    });

    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('Redis Socket.IO adapter pub error', err);
    });

    subClient.on('error', (err) => {
      console.error('Redis Socket.IO adapter sub error', err);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient, {
      key: redisKeys.socketIoAdapter(),
    });
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
