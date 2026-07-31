import { Module } from '@nestjs/common';

import { UserRoleMapper } from './mappper/user-role.mapper';

import { UserRoleValidationService } from './services/user-role-validation.service';
import { UserRoleDomainService } from './services/user-role-domain.service';
import { UserRoleCommandService } from './services/user-role-command.service';

@Module({
  imports: [],

  controllers: [],

  providers: [
    UserRoleMapper,
    UserRoleValidationService,
    UserRoleDomainService,
    UserRoleCommandService,
  ],

  exports: [
    UserRoleMapper,
    UserRoleValidationService,
    UserRoleDomainService,
    UserRoleCommandService,
  ],
})
export class UserRolesModule {}
