import { Role } from '@prisma/client';

import { RoleResponseDto } from '../responses';

export class RoleMapper {
  static toResponse(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static toResponseList(roles: Role[]): RoleResponseDto[] {
    return roles.map(this.toResponse);
  }
}
