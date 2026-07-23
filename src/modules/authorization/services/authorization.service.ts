import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthorizationContext } from '../domain';

import { AuthorizationRepository } from '../repositories/authorization.repository';
import { PermissionCacheService } from './permission-cache.service';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
    const cached = this.permissionCacheService.get(userId);

    if (cached) {
      return cached;
    }

    const context =
      await this.authorizationRepository.findAuthorizationContext(userId);

    if (!context) {
      throw new NotFoundException('Authorization context not found.');
    }

    this.permissionCacheService.set(userId, context);

    return context;
  }

  /**
   * ----------------------------------------
   * Private Helpers
   * ----------------------------------------
   */

  private async getUserRoleNames(userId: string): Promise<Set<string>> {
    const context = await this.getAuthorizationContext(userId);

    return new Set(context.roles.map((role) => role.name));
  }

  private async getUserPermissionNames(userId: string): Promise<Set<string>> {
    const context = await this.getAuthorizationContext(userId);

    return new Set(
      context.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
    );
  }

  /**
   * ----------------------------------------
   * Permission Methods
   * ----------------------------------------
   */

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissionNames(userId);

    return permissions.has(permission);
  }

  async hasPermissions(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissionNames(userId);

    return permissions.every((permission) => userPermissions.has(permission));
  }

  /**
   * ----------------------------------------
   * Role Methods
   * ----------------------------------------
   */

  async hasRole(userId: string, role: string): Promise<boolean> {
    const userRoles = await this.getUserRoleNames(userId);

    return userRoles.has(role);
  }

  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const userRoles = await this.getUserRoleNames(userId);

    return roles.some((role) => userRoles.has(role));
  }

  async hasAllRoles(userId: string, roles: string[]): Promise<boolean> {
    const userRoles = await this.getUserRoleNames(userId);

    return roles.every((role) => userRoles.has(role));
  }
}
