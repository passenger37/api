import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/index';
import { PrismaModule } from './core/database';
import { TestModule } from './modules/test/test.module';
import { AppLoggerModule } from './core/logger/logger.module';
import { HealthModule } from './modules/health/heath.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/reespomse.interceptor';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth';
import { SessionsModule } from './modules/sessions/sessions.module';


@Module({
  imports: [AppConfigModule, PrismaModule, TestModule, AppLoggerModule,HealthModule, UsersModule, AuthModule, SessionsModule],
  controllers: [],
  // providers: [AppService],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
