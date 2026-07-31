import { Prisma } from '@prisma/client';

import { AssignPermissionToRoleDto } from '../dto';

export class RolePermissionFactory {
  /**
   * Build Prisma create input
   */
  static create(
    dto: AssignPermissionToRoleDto,
  ): Prisma.RolePermissionCreateInput {
    return {
      role: {
        connect: {
          id: dto.roleId,
        },
      },

      permission: {
        connect: {
          id: dto.permissionId,
        },
      },
    };
  }
}
