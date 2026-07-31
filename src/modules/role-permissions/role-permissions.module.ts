import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories/role-permissions.repository';
import { RolePermissionValidationService } from './services/role-permission-validation.service';

@Module({
  providers: [RolePermissionsRepository, RolePermissionValidationService],

  exports: [RolePermissionsRepository, RolePermissionValidationService],
})
export class RolePermissionsModule {}
