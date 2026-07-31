import { RolePermission } from '@prisma/client';

import { RolePermissionResponseDto } from '../dto/role-permission-response.dto';

export class RolePermissionMapper {
  /**
   * Entity -> Response DTO
   */
  static toResponse(entity: RolePermission): RolePermissionResponseDto {
    return {
      id: entity.id,

      roleId: entity.roleId,

      permissionId: entity.permissionId,

      createdAt: entity.createdAt,
    };
  }

  /**
   * Entity[] -> Response DTO[]
   */
  static toResponseList(
    entities: RolePermission[],
  ): RolePermissionResponseDto[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}
