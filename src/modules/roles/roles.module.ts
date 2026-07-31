import { Module } from '@nestjs/common';

import { RolesController } from './controllers/roles.controller';

import { RolesRepository } from './repositories/roles.repository';

import { RolesService } from './services/roles.service';
import { RoleQueryService } from './services/role-query.service';
import { RoleCommandService } from './services/role-command.service';
import { RoleDomainService } from './services/role-domain.service';
import { RoleValidationService } from './services/validation.service';

@Module({
  controllers: [RolesController],

  providers: [
    RolesRepository,

    RolesService,

    RoleQueryService,
    RoleCommandService,

    RoleDomainService,

    RoleValidationService,
  ],

  exports: [RolesService, RoleQueryService, RoleCommandService],
})
export class RolesModule {}
