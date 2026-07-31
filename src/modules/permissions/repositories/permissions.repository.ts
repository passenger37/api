import { Injectable } from '@nestjs/common';

import { Permission, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

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

  findMany(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: {
        createdAt: 'desc',
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
}
