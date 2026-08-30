import { Injectable } from '@nestjs/common';

import { AuthUserRoleRepository } from '../repositories/auth-user-role.repository';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly authUserRoleRepository: AuthUserRoleRepository,
  ) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles =
      await this.authUserRoleRepository.findUserRolesWithPermissions(userId);

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return [...permissions];
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const roles =
      await this.authUserRoleRepository.findUserRolesWithRole(userId);

    return roles.map((r) => r.role.name);
  }
}
