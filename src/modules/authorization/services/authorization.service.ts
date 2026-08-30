import { Injectable } from '@nestjs/common';

import { AuthorizationQueryService } from './authorization-query.service';
import { AuthorizationCommandService } from './authorization-command.service';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly queryService: AuthorizationQueryService,
    private readonly commandService: AuthorizationCommandService,
  ) {}

  // =====================================================
  // Authorization Context
  // =====================================================

  getAuthorizationContext(userId: string) {
    return this.queryService.getAuthorizationContext(userId);
  }

  // =====================================================
  // Permission Queries
  // =====================================================

  hasPermission(userId: string, permission: string) {
    return this.queryService.hasPermission(userId, permission);
  }

  hasPermissions(userId: string, permissions: string[]) {
    return this.queryService.hasPermissions(userId, permissions);
  }

  // =====================================================
  // Role Queries
  // =====================================================

  hasRole(userId: string, role: string) {
    return this.queryService.hasRole(userId, role);
  }

  hasAnyRole(userId: string, roles: string[]) {
    return this.queryService.hasAnyRole(userId, roles);
  }

  hasAllRoles(userId: string, roles: string[]) {
    return this.queryService.hasAllRoles(userId, roles);
  }

  // =====================================================
  // Commands
  // =====================================================

  assignPermission(roleId: string, permissionId: string) {
    return this.commandService.assignPermission(roleId, permissionId);
  }

  assignPermissions(roleId: string, permissionIds: string[]) {
    return this.commandService.assignPermissions(roleId, permissionIds);
  }

  removePermission(roleId: string, permissionId: string) {
    return this.commandService.removePermission(roleId, permissionId);
  }

  replacePermissions(roleId: string, permissionIds: string[]) {
    return this.commandService.replacePermissions(roleId, permissionIds);
  }

  // =====================================================
  // Cache
  // =====================================================

  invalidateAuthorization(userId: string) {
    return this.queryService.invalidateAuthorization(userId);
  }

  invalidateUsersForRole(roleId: string) {
    return this.commandService.invalidateUsersForRole(roleId);
  }
}
