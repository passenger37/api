import { Module } from '@nestjs/common';

import { RolesRepository } from './repositories/roles.repository';

import { RolesService } from './services/roles.service';
import { RoleQueryService } from './services/role-query.service';
import { RoleCommandService } from './services/role-command.service';
import { RoleDomainService } from './services/role-domain.service';
import { RoleValidationService } from './services/role-validation.service';

import { RoleFactory } from './factories';

import { RoleMapper } from './mappers/role.mapper';

@Module({
  imports: [],

  providers: [
    RoleFactory,
    RolesRepository,

    RolesService,

    RoleQueryService,
    RoleCommandService,

    RoleDomainService,

    RoleValidationService,
    RoleMapper,
  ],

  exports: [
    RolesService,
    RoleQueryService,
    RoleCommandService,
    RolesRepository,
    RoleMapper,
  ],
})
export class RolesModule {}
