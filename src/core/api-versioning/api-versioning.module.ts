import { APP_INTERCEPTOR } from '@nestjs/core';
import { Global, Module } from '@nestjs/common';
import { ApiVersionControlService } from './api-version-control.service';
import { ApiVersionControlController } from './api-version-control.controller';
import { DeprecationHeaderInterceptor } from './api-version-control.interceptor';

/**
 * Lecture 40.84 - API Versioning / Evolution.
 *
 * Backend-first version control. @Global so any feature can inject
 * `ApiVersionControlService`; the deprecation interceptor is registered
 * app-wide (via APP_INTERCEPTOR) so every `/v1` response advertises its
 * migration path while `/v2` stays clean.
 */
@Global()
@Module({
  controllers: [ApiVersionControlController],
  providers: [
    ApiVersionControlService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DeprecationHeaderInterceptor,
    },
  ],
  exports: [ApiVersionControlService],
})
export class ApiVersioningModule {}
