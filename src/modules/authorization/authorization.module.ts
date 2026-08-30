import { Module } from '@nestjs/common';

import { AuthorizationRepository } from './repositories/authorization.repository';
import { AuthorizationService } from './services/authorization.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { AuthorizationValidationService } from './services/authorization-validation.service';
import { AuthorizationDomainService } from './services/authorization-domain.service';
import { AuthorizationQueryService } from './services/authorization-query.service';
import { AuthorizationCommandService } from './services/authorization-command.service';
import { AuthorizationAuditService } from './services/authorization-audit.service';
@Module({
  imports: [
    RolesModule,
    PermissionsModule,
    UsersModule,
    UserRolesModule,
    RolePermissionsModule,
  ],

  controllers: [],

  providers: [
    AuthorizationRepository,
    PermissionCacheService,
    AuthorizationService,
    AuthorizationValidationService,
    AuthorizationDomainService,
    AuthorizationQueryService,
    AuthorizationCommandService,
    AuthorizationAuditService,
  ],

  exports: [AuthorizationService, AuthorizationAuditService],
})
export class AuthorizationModule {}
