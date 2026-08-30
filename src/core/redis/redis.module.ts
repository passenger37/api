import { Global, Module } from '@nestjs/common';

import { RedisLockService } from './redis-lock.service';
import { RedisPubSubService } from './redis-pub-sub.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, RedisLockService, RedisPubSubService],
  exports: [RedisService, RedisLockService, RedisPubSubService],
})
export class RedisModule {}
