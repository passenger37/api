import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreateRoleDto, UpdateRoleDto } from '../dto';

import { CreateRoleMapper, UpdateRoleMapper } from '../mappers';

@Injectable()
export class RoleFactory {
  create(dto: CreateRoleDto): Prisma.RoleCreateInput {
    return CreateRoleMapper.toPrismaCreate(dto);
  }

  update(dto: UpdateRoleDto): Prisma.RoleUpdateInput {
    return UpdateRoleMapper.toPrismaUpdate(dto);
  }
}
