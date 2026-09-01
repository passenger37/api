import { Global, Module } from '@nestjs/common';

import { RedisLockService } from './redis-lock.service';
import { RedisPubSubService } from './redis-pub-sub.service';
import { RedisService } from './redis.service';
import { RedisNodeRegistry } from './redis-node-registry';
import { RedisNodeController } from './redis-node.controller';

@Global()
@Module({
  controllers: [RedisNodeController],
  providers: [RedisService, RedisLockService, RedisPubSubService, RedisNodeRegistry],
  exports: [RedisService, RedisLockService, RedisPubSubService, RedisNodeRegistry],
})
export class RedisModule {}
