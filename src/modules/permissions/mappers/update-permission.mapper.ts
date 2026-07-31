import { Prisma } from '@prisma/client';

import { UpdatePermissionDto } from '../dto';

export class UpdatePermissionMapper {
  static toPrismaUpdate(
    dto: UpdatePermissionDto,
  ): Prisma.PermissionUpdateInput {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),

      ...(dto.resource !== undefined && {
        resource: dto.resource.trim().toLowerCase(),
      }),

      ...(dto.action !== undefined && {
        action: dto.action.trim().toLowerCase(),
      }),

      ...(dto.description !== undefined && {
        description: dto.description?.trim() ?? null,
      }),
    };
  }
}
