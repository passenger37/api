import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/index';
import { PrismaModule } from './core/database';
import { AppLoggerModule } from './core/logger/logger.module';
import { TracingModule } from './core/tracing/tracing.module';
import { MetricsModule } from './core/metrics/metrics.module';
import { HttpMetricsInterceptor } from './core/metrics/metrics.interceptor';
import { LoadModelModule } from './core/load-model/load-model.module';
import { CapacityModelModule } from './core/capacity-model/capacity-model.module';
import { DbQueryOptimizerModule } from './core/db/query-optimizer/db-query-optimizer.module';
import { CacheModule } from './core/cache/cache.module';
import { ApiVersioningModule } from './core/api-versioning/api-versioning.module';
import { ContractsModule } from './core/contracts/contracts.module';
import { SecurityAuditModule } from './core/security/security-audit.module';
import { ProfilingModule } from './core/profiling/profiling.module';
import { ProductionReadinessModule } from './core/production-readiness/production-readiness.module';
import { HealthModule } from './modules/health/heath.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/reesponse.interceptor';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PermissionsModule } from './modules/permissions';
import { RolesModule } from './modules/roles/roles.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { RedisModule } from './core/redis/redis.module';
import { ServersModule } from './modules/servers/servers.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { FeedModule } from './modules/feed/feed.module';
import { DirectMessagesModule } from './modules/direct-messages/direct-messages.module';
import { E2eeDevicesModule } from './modules/e2ee-devices/e2ee-devices.module';
import { E2eeKeyDistributionModule } from './modules/e2ee-key-distribution/e2ee-key-distribution.module';
import { E2eeSessionsModule } from './modules/e2ee-sessions/e2ee-sessions.module';
import { E2eeRatchetModule } from './modules/e2ee-ratchet/e2ee-ratchet.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CallingModule } from './modules/calling/calling.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    TracingModule,
    AppLoggerModule,
    MetricsModule,
    LoadModelModule,
    CapacityModelModule,
    DbQueryOptimizerModule,
    CacheModule,
    ApiVersioningModule,
    ContractsModule,
    SecurityAuditModule,
    ProfilingModule,
    ProductionReadinessModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SessionsModule,
    PermissionsModule,
    RolesModule,
    UserRolesModule,
    AuthorizationModule,
    RedisModule,
    ServersModule,
    MessagesModule,
    ModerationModule,
    FeedModule,
    DirectMessagesModule,
    E2eeDevicesModule,
    E2eeKeyDistributionModule,
    E2eeSessionsModule,
    E2eeRatchetModule,
    JobsModule,
    NotificationsModule,
    CommunitiesModule,
    RealtimeModule,
    CallingModule,
  ],
  controllers: [],
  // providers: [AppService],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    BootstrapService,
  ],
})
export class AppModule {}
