import { Module } from '@nestjs/common';

import { RolePermissionsRepository } from './repositories/role-permissions.repository';
import { RolePermissionValidationService } from './services/role-permission-validation.service';
import { RolePermissionDomainService } from './services/role-permission-domain.service';
import { RolePermissionQueryService } from './services/role-permission-query.service';
import { RolePermissionCommandService } from './services/role-permission-command.service';
import { RolePermissionsService } from './services/role-permissions.service';

import { RolePermissionsController } from './controllers/role-permissions.controller';

@Module({
  controllers: [RolePermissionsController],
  providers: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
    RolePermissionCommandService,
    RolePermissionsService,
  ],

  exports: [
    RolePermissionsRepository,
    RolePermissionValidationService,
    RolePermissionDomainService,
    RolePermissionQueryService,
    RolePermissionCommandService,
    RolePermissionsService,
  ],
})
export class RolePermissionsModule {}
