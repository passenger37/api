import { Prisma } from '@prisma/client';

import { CreatePermissionDto } from '../dto';

export class CreatePermissionMapper {
  static toPrismaCreate(
    dto: CreatePermissionDto,
  ): Prisma.PermissionCreateInput {
    return {
      name: dto.name.trim(),

      resource: dto.resource.trim().toLowerCase(),

      action: dto.action.trim().toLowerCase(),

      description: dto.description?.trim() ?? null,

      isSystem: false,
    };
  }
}
