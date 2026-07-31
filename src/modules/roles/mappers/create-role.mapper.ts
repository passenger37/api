import { Prisma } from '@prisma/client';

import { CreateRoleDto } from '../dto';

export class CreateRoleMapper {
  static toPrismaCreate(dto: CreateRoleDto): Prisma.RoleCreateInput {
    return {
      name: dto.name.trim(),

      description: dto.description?.trim() || null,
    };
  }
}
