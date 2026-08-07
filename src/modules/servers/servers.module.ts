import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersController } from './controllers/servers.controller';

import { ServersService } from './services/servers.service';
import { ServerCommandService } from './services/server-command.service';
import { ServerQueryService } from './services/server-query.service';
import { ServerValidationService } from './services/server-validation.service';
import { ServerSlugService } from './services/server-slug.service';
import { ServerStructureService } from './services/server-structure.service';
import { ServerRoleAssignmentService } from './services/server-role-assignment.service';
import { ServerPermissionService } from './services/server-permission.service';

import { ServerRepository } from './repositories/server.repository';
import { ServerMemberRepository } from './repositories/server-member.repository';
import { ServerRoleRepository } from './repositories/server-role.repository';
import { ServerCategoryRepository } from './repositories/server-category.repository';
import { ServerChannelRepository } from './repositories/server-channel.repository';
import { ServerRoleAssignmentRepository } from './repositories/server-role-assignment.repository';
import { ServerTemplateFactory } from './factories/server-template.factory';
import { CodingTemplate } from './factories/templates/coding.template';
import { ClassroomTemplate } from './factories/templates/classroom.template';
import { ServerHierarchyService } from './services/server-hierarchy.service';
import { ServerRoleService } from './services/server-role.service';
import { InviteCodeService } from './invites/services/invite-code.service';
import { ServerInviteValidationService } from './invites/services/server-invite-validation.service';
import { ServerPermissionGuard } from './gaurds/server-permission.guard';
import { ServerInviteCommandService } from './invites/services/server-invite-command.service';
import { ServerMemberService } from './services/server-member.service';
import { ServerInviteRepository } from './invites/repositories/server-invite.repository';
import { ServerMemberQueryService } from './services/server-member-query.service';
import { ServerInviteController } from './controllers/server-invite.controller';
import { ServerRoleQueryService } from './services/server-role-query.service';
import { ServerRolePermissionRepository } from './repositories/server-role-permission.repository';
import { ServerRoleCommandService } from './services/server-role-command.service';
import { ServerRoleValidationService } from './services/server-role-validation.service';
import { ServerRoleController } from './controllers/server-role.controller';
import { ServerAuthorizationService } from './services/server-authorization.service';
import { ServerRoleAssignmentCommandService } from './services/server-role-assignment-command.service';
import { ServerRoleAssignmentQueryService } from './services/server-role-assignment-query.service';
import { ServerRolePermissionCommandService } from './services/server-role-permission-command.service';
import { ServerRolePermissionQueryService } from './services/server-role-permission-query.service';
import { ServerRolePermissionValidationService } from './services/server-role-permission-validation.service';
import { ServerChannelCommandService } from './services/server-channel-command.service';
import { ServerChannelValidationService } from './services/server-channel-validation.service';
import { ServerCategoryValidationService } from './services/server-category-validation.service';
import { ServerCategoryCommandService } from './services/server-category-command.service';
import { ServerChannelQueryService } from './services/server-channel-query.service';
import { ServerRolePermissionController } from './controllers/server-role-permission.controller';
import { ServerMemberController } from './controllers/server-member.controller';
import { ServerChannelController } from './controllers/server-channel.controller';

@Module({
  imports: [PrismaModule],

  controllers: [
    ServersController,
    ServerInviteController,
    ServerRoleController,
    ServerRolePermissionController,
    ServerMemberController,
    ServerChannelController,
  ],

  providers: [
    // Services
    ServersService,
    ServerCommandService,
    ServerQueryService,
    ServerValidationService,
    ServerSlugService,
    ServerStructureService,
    ServerRoleService,
    ServerRepository,
    ServerMemberRepository,
    ServerRoleRepository,
    ServerCategoryRepository,
    ServerChannelRepository,
    ServerRoleAssignmentRepository,
    ServerTemplateFactory,
    CodingTemplate,
    ClassroomTemplate,
    ServerInviteRepository,
    InviteCodeService,
    ServerInviteValidationService,
    ServerInviteCommandService,
    ServerRoleAssignmentService,
    ServerPermissionService,
    ServerPermissionGuard,
    ServerMemberService,
    ServerMemberQueryService,
    ServerRoleQueryService,
    ServerRolePermissionRepository,
    ServerRoleCommandService,
    ServerRoleValidationService,
    ServerAuthorizationService,
    ServerHierarchyService,
    ServerRolePermissionCommandService,
    ServerRolePermissionQueryService,
    ServerRolePermissionValidationService,
    ServerRoleAssignmentCommandService,
    ServerRoleAssignmentQueryService,
    ServerChannelCommandService,
    ServerChannelValidationService,
    ServerCategoryValidationService,
    ServerCategoryCommandService,
    ServerChannelQueryService,
  ],

  exports: [ServersService],
})
export class ServersModule {}
