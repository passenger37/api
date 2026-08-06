import { Injectable } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

import { ServerRolePermissionRepository } from '../repositories/server-role-permission.repository';

import { ServerPermissionService } from './server-permission.service';
import { ServerRoleValidationService } from './server-role-validation.service';
import { ServerHierarchyService } from './server-hierarchy.service';
import { UpdateRolePermissionsRequest } from '../dto/request/update-role-permissions.request';

@Injectable()
export class ServerRolePermissionCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly permissionService: ServerPermissionService,
    private readonly hierarchyService: ServerHierarchyService,
    private readonly rolePermissionRepository: ServerRolePermissionRepository,
    private readonly validationService: ServerRoleValidationService,
  ) {}

  async replacePermissions(
    serverId: string,
    roleId: string,
    actorId: string,
    request: UpdateRolePermissionsRequest,
  ) {
    // Permission
    await this.permissionService.requirePermission(
      serverId,
      actorId,
      ServerPermission.ROLE_UPDATE,
    );

    // Hierarchy
    await this.hierarchyService.requireManageRole(serverId, actorId, roleId);

    // Role Exists
    await this.validationService.validateRoleExists(roleId);

    return this.prisma.$transaction(async (tx) => {
      await this.rolePermissionRepository.replacePermissions(
        roleId,
        request.permissions,
        tx,
      );
    });
  }
}
