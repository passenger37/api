import { Injectable } from '@nestjs/common';

import { Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Create
  // =====================================================

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({
      data,
    });
  }

  // =====================================================
  // Read
  // =====================================================

  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: {
        name,
      },
    });
  }

  async findMany(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // =====================================================
  // Update
  // =====================================================

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return this.prisma.role.update({
      where: {
        id,
      },
      data,
    });
  }

  // =====================================================
  // Delete
  // =====================================================

  async delete(id: string): Promise<Role> {
    return this.prisma.role.delete({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Exists
  // =====================================================

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.role.count({
      where: {
        name,
      },
    });

    return count > 0;
  }
}
