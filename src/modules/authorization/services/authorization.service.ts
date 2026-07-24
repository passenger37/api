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

  private getRoleNames(context: AuthorizationContext): Set<string> {
    return new Set(context.roles.map((role) => role.name));
  }

  private getPermissionNames(context: AuthorizationContext): Set<string> {
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
    const context = await this.getAuthorizationContext(userId);

    return this.getPermissionNames(context).has(permission);
  }

  async hasPermissions(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userPermissions = this.getPermissionNames(context);

    return permissions.every((permission) => userPermissions.has(permission));
  }

  /**
   * ----------------------------------------
   * Role Methods
   * ----------------------------------------
   */

  async hasRole(userId: string, role: string): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    return this.getRoleNames(context).has(role);
  }

  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userRoles = this.getRoleNames(context);

    return roles.some((role) => userRoles.has(role));
  }

  async hasAllRoles(userId: string, roles: string[]): Promise<boolean> {
    const context = await this.getAuthorizationContext(userId);

    const userRoles = this.getRoleNames(context);

    return roles.every((role) => userRoles.has(role));
  }

  /**
   * ----------------------------------------
   * Cache Invalidation
   * ----------------------------------------
   */

  async invalidateAuthorization(userId: string): Promise<void> {
    await this.authorizationRepository.incrementPermissionVersion(userId);

    this.permissionCacheService.delete(userId);
  }
}
