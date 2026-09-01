import { Global, Module } from '@nestjs/common';
import { DbCacheService } from './db-cache.service';
import { CacheArchitectureService } from './cache-architecture.service';
import { CacheArchitectureController } from './cache-architecture.controller';

/**
 * Lecture 40.83 — Cache Architecture.
 *
 * @Global so DbCacheService can be injected into hot query/command services
 * (servers, DMs, etc.) without each feature module importing this explicitly.
 * RedisService and MetricsService are provided by their own global modules.
 */
@Global()
@Module({
  controllers: [CacheArchitectureController],
  providers: [DbCacheService, CacheArchitectureService],
  exports: [DbCacheService, CacheArchitectureService],
})
export class CacheModule {}
