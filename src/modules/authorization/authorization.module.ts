import { Module } from '@nestjs/common';

import { AuthorizationRepository } from './repositories/authorization.repository';
import { AuthorizationService } from './services/authorization.service';
import { PermissionCacheService } from '../authorization/services/permission-cache.service';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';

@Module({
  imports: [],

  controllers: [],

  providers: [
    AuthorizationRepository,
    PermissionCacheService,
    AuthorizationService,
    UsersModule,
    RolesModule,
    PermissionsModule,
    UserRolesModule,
    RolePermissionsModule,
  ],

  exports: [AuthorizationService],
})
export class AuthorizationModule {}
