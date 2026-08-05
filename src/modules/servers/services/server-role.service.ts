import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DEFAULT_SERVER_ROLES } from '../constants/default-server-roles';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/default-role-permissions';

import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRolePermissionRepository } from '../repositories/server-role-permission.repository';

@Injectable()
export class ServerRoleService {
  constructor(
    private readonly roleRepository: ServerRoleRepository,
    private readonly rolePermissionRepository: ServerRolePermissionRepository,
  ) {}

  async createDefaultRoles(
    serverId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (const defaultRole of DEFAULT_SERVER_ROLES) {
      // Create Role
      const role = await this.roleRepository.create(
        {
          server: {
            connect: {
              id: serverId,
            },
          },
          name: defaultRole.name,
          position: defaultRole.position,
        },
        tx,
      );

      // Get permissions for this role
      const permissions = DEFAULT_ROLE_PERMISSIONS[defaultRole.name] ?? [];

      // Create permission records
      for (const permission of permissions) {
        await this.rolePermissionRepository.create(
          {
            role: {
              connect: {
                id: role.id,
              },
            },
            permission,
          },
          tx,
        );
      }
    }
  }
}
