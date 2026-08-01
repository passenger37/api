import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/index';
import { PrismaModule } from './core/database';
import { AppLoggerModule } from './core/logger/logger.module';
import { HealthModule } from './modules/health/heath.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/reespomse.interceptor';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PermissionsModule } from './modules/permissions';
import { RolesModule } from './modules/roles/roles.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { BootstrapService } from './bootstrap/bootstrap.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AppLoggerModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SessionsModule,
    PermissionsModule,
    RolesModule,
    UserRolesModule,
    AuthorizationModule,
  ],
  controllers: [],
  // providers: [AppService],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    BootstrapService,
  ],
})
export class AppModule {}
