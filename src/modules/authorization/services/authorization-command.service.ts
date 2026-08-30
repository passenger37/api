import { Injectable } from '@nestjs/common';

import { AuthorizationDomainService } from './authorization-domain.service';
import { AuthorizationValidationService } from './authorization-validation.service';
import { AuthorizationAuditService } from './authorization-audit.service';

import { AuthorizationAuditAction } from '../constants/authorization-audit-action.enum';

@Injectable()
export class AuthorizationCommandService {
  constructor(
    private readonly validation: AuthorizationValidationService,
    private readonly domain: AuthorizationDomainService,
    private readonly audit: AuthorizationAuditService,
  ) {}

  // =====================================================
  // Assign One Permission
  // =====================================================

  async assignPermission(
    roleId: string,
    permissionId: string,
    actorId?: string,
  ) {
    await this.validation.validatePermissionAssignment(roleId, permissionId);

    const result = await this.domain.assignPermission(roleId, permissionId);

    await this.domain.bumpPermissionVersionForRoleUsers(roleId);

    await this.audit.log({
      actorId,
      action: AuthorizationAuditAction.ASSIGN_PERMISSION,
      roleId,
      permissionId,
    });

    return result;
  }

  // =====================================================
  // Assign Multiple Permissions
  // =====================================================

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    actorId?: string,
  ) {
    await this.validation.validatePermissionAssignments(roleId, permissionIds);

    const result = await this.domain.assignPermissions(roleId, permissionIds);

    await this.domain.bumpPermissionVersionForRoleUsers(roleId);

    await this.audit.log({
      actorId,
      action: AuthorizationAuditAction.ASSIGN_PERMISSIONS,
      roleId,
      metadata: {
        permissionIds,
      },
    });

    return result;
  }

  // =====================================================
  // Remove Permission
  // =====================================================

  async removePermission(
    roleId: string,
    permissionId: string,
    actorId?: string,
  ) {
    await this.validation.validatePermissionAssignmentExists(
      roleId,
      permissionId,
    );

    const result = await this.domain.removePermission(roleId, permissionId);

    await this.domain.bumpPermissionVersionForRoleUsers(roleId);

    await this.audit.log({
      actorId,
      action: AuthorizationAuditAction.REMOVE_PERMISSION,
      roleId,
      permissionId,
    });

    return result;
  }

  // =====================================================
  // Replace Permissions
  // =====================================================

  async replacePermissions(
    roleId: string,
    permissionIds: string[],
    actorId?: string,
  ) {
    await this.validation.validateRoleExists(roleId);

    await this.validation.validatePermissionsExist(permissionIds);

    await this.domain.removeAllPermissions(roleId);

    const result = await this.domain.assignPermissions(roleId, permissionIds);

    await this.domain.bumpPermissionVersionForRoleUsers(roleId);

    await this.audit.log({
      actorId,
      action: AuthorizationAuditAction.REPLACE_PERMISSIONS,
      roleId,
      metadata: {
        permissionIds,
      },
    });

    return result;
  }

  // =====================================================
  // Invalidate Cache For Role Users
  // =====================================================

  async invalidateUsersForRole(roleId: string): Promise<void> {
    await this.domain.bumpPermissionVersionForRoleUsers(roleId);
  }
}
