import { Injectable } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

import { ServerRolePermissionRepository } from '../repositories/server-role-permission.repository';

import { ServerPermissionService } from './server-permission.service';
import { ServerRoleValidationService } from './server-role-validation.service';
import { ServerHierarchyService } from './server-hierarchy.service';
import { ReplaceRolePermissionsRequest } from '../dto/request/replace-role-permissions.request';
import { ServerRoleAssignmentQueryService } from './server-role-assignment-query.service';

@Injectable()
export class ServerRolePermissionCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleAssignmentQueryService: ServerRoleAssignmentQueryService,
    private readonly permissionService: ServerPermissionService,
    private readonly hierarchyService: ServerHierarchyService,
    private readonly rolePermissionRepository: ServerRolePermissionRepository,
    private readonly validationService: ServerRoleValidationService,
  ) {}

  async replacePermissions(
    serverId: string,
    roleId: string,
    actorId: string,
    request: ReplaceRolePermissionsRequest,
  ) {
    // 1. Verify the actor can modify roles.
    await this.permissionService.requirePermission(
      serverId,
      actorId,
      ServerPermission.ROLE_UPDATE,
    );

    // 2. Verify role hierarchy.
    await this.hierarchyService.requireManageRole(serverId, actorId, roleId);

    // 3. Verify the role exists.
    await this.validationService.validateRoleExists(roleId);

    // 4. Replace permissions atomically.
    await this.prisma.$transaction(async (tx) => {
      await this.rolePermissionRepository.replacePermissions(
        roleId,
        request.permissions,
        tx,
      );
    });

    // 5. Find every member affected by this role change.
    const memberIds =
      await this.roleAssignmentQueryService.getMemberIdsByRole(roleId);

    // 6. Invalidate their permission caches.
    for (const memberId of memberIds) {
      this.permissionService.clearUserCache(serverId, memberId);
    }

    return {
      success: true,
    };
  }
}
