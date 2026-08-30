import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      orderBy: {
        resource: 'asc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  findByName(name: string) {
    return this.prisma.permission.findUnique({
      where: {
        name,
      },
    });
  }

  findRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  createRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  removeRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  countUsersWithPermission(userId: string, name: string) {
    return this.prisma.userRole.count({
      where: {
        userId,
        role: {
          permissions: {
            some: {
              permission: {
                name,
              },
            },
          },
        },
      },
    });
  }
}
