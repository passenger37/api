import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

import { UserRoleMapper } from './mappper/user-role.mapper';

import { UserRolesRepository } from './repositories';

import { UserRoleValidationService } from './services/user-role-validation.service';
import { UserRoleDomainService } from './services/user-role-domain.service';
import { UserRoleQueryService } from './services/user-role-query.service';
import { UserRoleCommandService } from './services/user-role-command.service';
import { UserRolesService } from './services/user-roles.service';

import { UserRolesController } from './controllers/user-roles.controller';

@Module({
  imports: [UsersModule, RolesModule],

  controllers: [UserRolesController],

  providers: [
    UserRolesRepository,
    UserRoleMapper,
    UserRoleValidationService,
    UserRoleDomainService,
    UserRoleQueryService,
    UserRoleCommandService,
    UserRolesService,
  ],

  exports: [
    UserRolesRepository,
    UserRoleMapper,
    UserRoleValidationService,
    UserRoleDomainService,
    UserRoleQueryService,
    UserRoleCommandService,
    UserRolesService,
  ],
})
export class UserRolesModule {}
