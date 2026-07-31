import { Injectable } from '@nestjs/common';

import { Prisma, RolePermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class RolePermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Assignment
  // ==========================================

  create(data: Prisma.RolePermissionCreateInput): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data,
    });
  }

  // ==========================================
  // Find By Id
  // ==========================================

  findById(id: string): Promise<RolePermission | null> {
    return this.prisma.rolePermission.findUnique({
      where: {
        id,
      },
    });
  }

  // ==========================================
  // Find Existing Assignment
  // ==========================================

  findByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  // ==========================================
  // Find Permissions Of Role
  // ==========================================

  findPermissionsByRole(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
      },

      include: {
        permission: true,
      },
    });
  }

  // ==========================================
  // Find Roles Of Permission
  // ==========================================

  findRolesByPermission(permissionId: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        permissionId,
      },

      include: {
        role: true,
      },
    });
  }

  // ==========================================
  // Delete Assignment
  // ==========================================

  delete(id: string): Promise<RolePermission> {
    return this.prisma.rolePermission.delete({
      where: {
        id,
      },
    });
  }

  // =====================================================
  // Find By Role
  // =====================================================

  findByRoleId(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
      },
    });
  }

  // =====================================================
  // Delete Many
  // =====================================================

  deleteMany(ids: string[]) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  // =====================================================
  // Create Many
  // =====================================================

  createMany(roleId: string, permissionIds: string[]) {
    return this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),

      skipDuplicates: true,
    });
  }
}
