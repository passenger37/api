import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionService } from './server-permission.service';
import { ServerHierarchyService } from './server-hierarchy.service';

import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';
import { ServerRoleValidationService } from './server-role-validation.service';
import { ServerMemberQueryService } from './server-member-query.service';

@Injectable()
export class ServerRoleAssignmentCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: ServerPermissionService,
    private readonly hierarchyService: ServerHierarchyService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly validation: ServerRoleValidationService,
    private readonly repository: ServerRoleAssignmentRepository,
  ) {}

  async assignRole(
    serverId: string,
    memberId: string,
    roleId: string,
    userId: string,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_ASSIGN,
    );

    await this.validation.validateRoleExists(roleId);

    await this.memberQueryService.getMemberOrThrow(serverId, memberId);

    await this.hierarchyService.requireManageRole(serverId, userId, roleId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.assignRole(memberId, roleId, tx);
    });
  }
}
