import { Role } from '@prisma/client';

import { RoleResponse } from '../responses';

export class RoleMapper {
  static toResponse(role: Role): RoleResponse {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static toResponseList(roles: Role[]): RoleResponse[] {
    return roles.map((role) => RoleMapper.toResponse(role));
  }
}
