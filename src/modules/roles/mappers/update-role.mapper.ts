import { Prisma } from '@prisma/client';

import { UpdateRoleDto } from '../dto';

export class UpdateRoleMapper {
  static toPrismaUpdate(dto: UpdateRoleDto): Prisma.RoleUpdateInput {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),

      ...(dto.description !== undefined && {
        description: dto.description ? dto.description.trim() : null,
      }),
    };
  }
}
