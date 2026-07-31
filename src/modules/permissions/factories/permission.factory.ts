import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreatePermissionDto, UpdatePermissionDto } from '../dto';

import { CreatePermissionMapper, UpdatePermissionMapper } from '../mappers';

@Injectable()
export class PermissionFactory {
  create(dto: CreatePermissionDto): Prisma.PermissionCreateInput {
    return CreatePermissionMapper.toPrismaCreate(dto);
  }

  update(dto: UpdatePermissionDto): Prisma.PermissionUpdateInput {
    return UpdatePermissionMapper.toPrismaUpdate(dto);
  }
}
