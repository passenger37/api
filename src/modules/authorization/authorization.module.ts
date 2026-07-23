import { Module } from '@nestjs/common';

import { AuthorizationRepository } from './repositories/authorization.repository';
import { AuthorizationService } from './services/authorization.service';
import { PermissionCacheService } from '../authorization/services/permission-cache.service';

@Module({
  imports: [],

  controllers: [],

  providers: [
    AuthorizationRepository,
    PermissionCacheService,
    AuthorizationService,
  ],

  exports: [AuthorizationService],
})
export class AuthorizationModule {}
