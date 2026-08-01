import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthorizationRepository } from '../repositories/authorization.repository';
import { PermissionCacheService } from './permission-cache.service';

import { AuthorizationContext } from '../domain';

@Injectable()
export class AuthorizationQueryService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly cache: PermissionCacheService,
  ) {}

  // =====================================================
  // Authorization Context
  // =====================================================

  async getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
    const cached = this.cache.get(userId);

    if (cached) {
      return cached;
    }

    const context = await this.repository.findAuthorizationContext(userId);

    if (!context) {
      throw new NotFoundException('Authorization context not found.');
    }

    this.cache.set(userId, context);

    return context;
  }

  // =====================================================
  // User Roles
  // =====================================================

  async getUserRoles(userId: string) {
    const user = await this.repository.findUserWithRoles(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user.roles.map((r) => r.role);
  }

  // =====================================================
  // User Permissions
  // =====================================================

  async getUserPermissions(userId: string) {
    const user = await this.repository.findUserPermissions(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user.roles.flatMap((userRole) =>
      userRole.role.permissions.map(
        (rolePermission) => rolePermission.permission,
      ),
    );
  }

  // =====================================================
  // Has One Permission
  // =====================================================

  async hasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    return context.roles.some((role) =>
      role.permissions.some((permission) => permission.name === permissionName),
    );
  }

  // =====================================================
  // Has Multiple Permissions
  // =====================================================

  async hasPermissions(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userPermissions = new Set(
      context.roles.flatMap((role) => role.permissions.map((p) => p.name)),
    );

    return permissions.every((permission) => userPermissions.has(permission));
  }

  // =====================================================
  // Has One Role
  // =====================================================

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    return context.roles.some((role) => role.name === roleName);
  }

  // =====================================================
  // Has Any Role
  // =====================================================

  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userRoles = new Set(context.roles.map((role) => role.name));

    return roles.some((role) => userRoles.has(role));
  }

  // =====================================================
  // Has All Roles
  // =====================================================

  async hasAllRoles(userId: string, roles: string[]): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userRoles = new Set(context.roles.map((role) => role.name));

    return roles.every((role) => userRoles.has(role));
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

  // =====================================================
  // Cache Invalidation
  // =====================================================

  async invalidateAuthorization(userId: string): Promise<void> {
    await this.repository.incrementPermissionVersion(userId);

    this.cache.delete(userId);
  }
}
