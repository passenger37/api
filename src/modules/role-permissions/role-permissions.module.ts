import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories/role-permissions.repository';
import { RolePermissionValidationService } from './services/role-permission-validation.service';
import { RolePermissionDomainService } from './services/role-permission-domain.service';

@Module({
  providers: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
  ],

  exports: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
  ],
})
export class RolePermissionsModule {}
