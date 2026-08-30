import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { AuthorizationRepository } from '../repositories/authorization.repository';
import { PermissionCacheService } from './permission-cache.service';

@Injectable()
export class AuthorizationDomainService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  // =====================================================
  // Assign One Permission
  // =====================================================

  async assignPermission(roleId: string, permissionId: string) {
    return this.repository.createRolePermission({
      role: {
        connect: {
          id: roleId,
        },
      },
      permission: {
        connect: {
          id: permissionId,
        },
      },
    });
  }

  // =====================================================
  // Assign Multiple Permissions
  // =====================================================

  async assignPermissions(roleId: string, permissionIds: string[]) {
    const data: Prisma.RolePermissionCreateManyInput[] = permissionIds.map(
      (permissionId) => ({
        roleId,
        permissionId,
      }),
    );

    return this.repository.createManyRolePermissions(data);
  }

  // =====================================================
  // Remove Permission
  // =====================================================

  async removePermission(roleId: string, permissionId: string) {
    return this.repository.deleteRolePermission(roleId, permissionId);
  }

  // =====================================================
  // Remove All Permissions
  // =====================================================

  async removeAllPermissions(roleId: string) {
    return this.repository.deleteRolePermissionsByRole(roleId);
  }

  // =====================================================
  // Bump Permission Version For All Users Of Role
  // =====================================================

  async bumpPermissionVersionForRoleUsers(roleId: string): Promise<void> {
    const role = await this.repository.findUsersByRole(roleId);

    if (!role) {
      return;
    }

    await this.repository.incrementPermissionVersions(
      role.users.map((userRole) => userRole.userId),
    );

    await Promise.all(
      role.users.map((userRole) =>
        this.permissionCacheService.delete(userRole.userId),
      ),
    );
  }
}
