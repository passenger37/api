import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories/role-permissions.repository';
import { RolePermissionValidationService } from './services/role-permission-validation.service';
import { RolePermissionDomainService } from './services/role-permission-domain.service';
import { RolePermissionQueryService } from './services/role-permission-query.service';
import { RolePermissionCommandService } from './services/role-permission-command.service';

@Module({
  providers: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
    RolePermissionCommandService,
  ],

  exports: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
    RolePermissionCommandService,
  ],
})
export class RolePermissionsModule {}
