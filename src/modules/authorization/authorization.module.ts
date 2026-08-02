import { Module } from '@nestjs/common';

import { AuthorizationRepository } from './repositories/authorization.repository';
import { AuthorizationService } from './services/authorization.service';
import { PermissionCacheService } from '../authorization/services/permission-cache.service';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { AuthorizationValidationService } from './services/authorization-validation.service';
import { AuthorizationDomainService } from './services/authorization-domain.service';
import { AuthorizationQueryService } from './services/authorization-query.service';
import { AuthorizationCommandService } from './services/authorization-command.service';
import { RolesGuard } from './guards/roles.guard';
import { AuthorizationAuditService } from './services/authorization-audit.service';
@Module({
  imports: [RolesModule, PermissionsModule],

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
    AuthorizationValidationService,
    AuthorizationDomainService,
    AuthorizationQueryService,
    AuthorizationCommandService,
    RolesGuard,
    AuthorizationAuditService,
  ],

  exports: [
    AuthorizationService,
    AuthorizationService,
    RolesGuard,
    AuthorizationAuditService,
  ],
})
export class AuthorizationModule {}
