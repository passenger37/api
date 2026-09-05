import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from '../../core/database/prisma.module';
import { RedisModule } from '../../core/redis/redis.module';

import { IdempotencyService } from './services/idempotency.service';
import { HttpRateLimitService } from './services/http-rate-limit.service';
import { AuditLogService } from './services/audit-log.service';
import { HttpRateLimitGuard } from './guards/http-rate-limit.guard';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { ProductionHardeningController } from './controllers/production-hardening.controller';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 1000,
        },
      ],
    }),
  ],
  controllers: [ProductionHardeningController],
  providers: [
    IdempotencyService,
    HttpRateLimitService,
    AuditLogService,
    HttpRateLimitGuard,
    IdempotencyGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [
    IdempotencyService,
    HttpRateLimitService,
    AuditLogService,
    HttpRateLimitGuard,
    IdempotencyGuard,
  ],
})
export class ProductionHardeningModule {}