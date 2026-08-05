import { Injectable, NotFoundException } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateServerRoleRequest } from '../dto/request/create-server-role.request';
import { ReorderServerRolesRequest } from '../dto/request/reorder-server-roles.request';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleValidationService } from './server-role-validation.service';
import { ServerPermissionService } from './server-permission.service';
import { ServerHierarchyService } from './server-hierarchy.service';
import { UpdateServerRoleRequest } from '../dto/request/update-server-role.request';

@Injectable()
export class ServerRoleCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: ServerHierarchyService,
    private readonly roleRepository: ServerRoleRepository,
    private readonly validation: ServerRoleValidationService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async createRole(
    serverId: string,
    userId: string,
    request: CreateServerRoleRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_CREATE,
    );

    await this.validation.validateUniqueName(serverId, request.name);

    const highestPosition =
      await this.roleRepository.getHighestPosition(serverId);

    return this.prisma.$transaction(async (tx) => {
      return this.roleRepository.create(
        {
          name: request.name,

          position: highestPosition + 1,

          server: {
            connect: {
              id: serverId,
            },
          },
        },
        tx,
      );
    });
  }

  async updateRole(
    serverId: string,
    roleId: string,
    userId: string,
    request: UpdateServerRoleRequest,
  ) {
    // 1. Permission Check
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_UPDATE,
    );

    // 2. Ensure Role Exists
    await this.validation.validateRoleExists(roleId);

    // 3. Validate Name (only if provided)
    if (request.name) {
      await this.validation.validateUniqueName(serverId, request.name);
    }

    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_UPDATE,
    );

    await this.hierarchyService.requireManageRole(serverId, userId, roleId);

    // 4. Update Role
    return this.prisma.$transaction(async (tx) => {
      return this.roleRepository.update(
        roleId,
        {
          ...(request.name && {
            name: request.name,
          }),

          // ...(request.color && {
          //   color: request.color,
          // }),

          // ...(request.hoist !== undefined && {
          //   hoist: request.hoist,
          // }),

          // ...(request.mentionable !== undefined && {
          //   mentionable: request.mentionable,
          // }),
        },
        tx,
      );
    });
  }

  async deleteRole(serverId: string, roleId: string, userId: string) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_DELETE,
    );

    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    await this.validation.validateNotDefaultRole(role);

    await this.validation.validateRoleHasNoMembers(roleId);
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_DELETE,
    );

    await this.hierarchyService.requireManageRole(serverId, userId, roleId);
    return this.prisma.$transaction(async (tx) => {
      await this.roleRepository.delete(roleId, tx);
    });
  }

  async reorderRoles(
    serverId: string,
    userId: string,
    request: ReorderServerRolesRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.ROLE_UPDATE,
    );

    return this.prisma.$transaction(async (tx) => {
      await Promise.all(
        request.roles.map((role) =>
          this.roleRepository.updatePosition(role.roleId, role.position, tx),
        ),
      );
    });
  }
}
