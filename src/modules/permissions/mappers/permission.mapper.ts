import { Permission } from '@prisma/client';

import { PermissionResponseDto } from '../dto/permission-response.dto';

export class PermissionMapper {
  /**
   * Convert Permission entity to response DTO
   */
  static toResponse(permission: Permission): PermissionResponseDto {
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

  /**
   * Convert multiple Permission entities
   */
  static toResponseList(permissions: Permission[]): PermissionResponseDto[] {
    return permissions.map(this.toResponse);
  }
}
