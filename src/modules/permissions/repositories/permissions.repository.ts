import { Injectable } from '@nestjs/common';

import { Permission, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { QueryPermissionsDto } from '../dto';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Create
  // =====================================================

  create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  // =====================================================
  // Find By Id
  // =====================================================

  findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Find By Name
  // =====================================================

  findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        name,
      },
    });
  }

  // =====================================================
  // Find Many
  // =====================================================

  async findMany(query: QueryPermissionsDto) {
    return this.prisma.permission.findMany({
      where: {
        ...(query.search && {
          OR: [
            {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              resource: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ],
        }),

        ...(query.resource && {
          resource: query.resource,
        }),

        ...(query.action && {
          action: query.action,
        }),

        ...(query.isSystem !== undefined && {
          isSystem: query.isSystem,
        }),
      },

      skip: (query.page - 1) * query.limit,

      take: query.limit,

      orderBy: {
        name: 'asc',
      },
    });
  }

  // =====================================================
  // Update
  // =====================================================

  update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.prisma.permission.update({
      where: {
        id,
      },
      data,
    });
  }

  // =====================================================
  // Delete
  // =====================================================

  delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Find Many By Ids
  // =====================================================

  findManyByIds(ids: string[]) {
    return this.prisma.permission.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
