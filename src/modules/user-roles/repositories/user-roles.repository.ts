import { Injectable } from '@nestjs/common';

import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class UserRolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Create
  // =====================================================

  create(data: Prisma.UserRoleCreateInput): Promise<UserRole> {
    return this.prisma.userRole.create({
      data,
    });
  }

  // =====================================================
  // Create Many
  // =====================================================

  createMany(data: Prisma.UserRoleCreateManyInput[]) {
    return this.prisma.userRole.createMany({
      data,
      skipDuplicates: true,
    });
  }

  // =====================================================
  // Find By Id
  // =====================================================

  findById(id: string): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Find By User + Role
  // =====================================================

  findByUserAndRole(userId: string, roleId: string): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  // =====================================================
  // Find Roles Of User
  // =====================================================

  findRolesByUser(userId: string) {
    return this.prisma.userRole.findMany({
      where: {
        userId,
      },

      include: {
        role: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // =====================================================
  // Find Users Of Role
  // =====================================================

  findUsersByRole(roleId: string) {
    return this.prisma.userRole.findMany({
      where: {
        roleId,
      },

      include: {
        user: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // =====================================================
  // Delete
  // =====================================================

  delete(id: string): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Delete By User + Role
  // =====================================================

  deleteByUserAndRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  // =====================================================
  // Delete All Roles Of User
  // =====================================================

  deleteByUser(userId: string) {
    return this.prisma.userRole.deleteMany({
      where: {
        userId,
      },
    });
  }

  async exists(userId: string, roleId: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        roleId,
      },
    });

    return count > 0;
  }
}
