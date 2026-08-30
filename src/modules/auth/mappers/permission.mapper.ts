import { Permission, RolePermission } from '@prisma/client';

import {
  AssignedRolePermissionResponse,
  PermissionResponse,
} from '../responses';

export class PermissionMapper {
  static toResponse(permission: Permission): PermissionResponse {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      isSystem: permission.isSystem,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  static toResponseList(permissions: Permission[]): PermissionResponse[] {
    return permissions.map((permission) =>
      PermissionMapper.toResponse(permission),
    );
  }

  static toAssignedRolePermission(
    assignment: RolePermission,
  ): AssignedRolePermissionResponse {
    return {
      id: assignment.id,
      roleId: assignment.roleId,
      permissionId: assignment.permissionId,
      createdAt: assignment.createdAt,
    };
  }
}
