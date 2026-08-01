import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthorizationRepository } from '../repositories/authorization.repository';

@Injectable()
export class AuthorizationQueryService {
  constructor(private readonly repository: AuthorizationRepository) {}

  // =====================================================
  // User Roles
  // =====================================================

  async getUserRoles(userId: string) {
    const user = await this.repository.findUserWithRoles(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user.roles.map((userRole) => userRole.role);
  }

  // =====================================================
  // User Permissions
  // =====================================================

  async getUserPermissions(userId: string) {
    const user = await this.repository.findUserPermissions(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map(
        (rolePermission) => rolePermission.permission,
      ),
    );

    return permissions;
  }

  // =====================================================
  // Has Permission
  // =====================================================

  async hasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    return permissions.some((permission) => permission.name === permissionName);
  }

  // =====================================================
  // Role Permissions
  // =====================================================

  async getRolePermissions(roleId: string) {
    const role = await this.repository.findRolePermissions(roleId);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role.permissions.map((rolePermission) => rolePermission.permission);
  }
}
