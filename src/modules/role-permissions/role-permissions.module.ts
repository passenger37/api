import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories/role-permissions.repository';
import { RolePermissionValidationService } from './services/role-permission-validation.service';
import { RolePermissionDomainService } from './services/role-permission-domain.service';
import { RolePermissionQueryService } from './services/role-permission-query.service';

@Module({
  providers: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
  ],

  exports: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
  ],
})
export class RolePermissionsModule {}
