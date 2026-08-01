import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { AuthorizationContext } from '../domain';

import { Prisma } from '@prisma/client';

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAuthorizationContext(
    userId: string,
  ): Promise<AuthorizationContext | null> {
    console.log('Loading authorization from database...');
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        permissionVersion: true,
        status: true,

        roles: {
          select: {
            role: {
              select: {
                id: true,

                name: true,

                permissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        name: true,
                        resource: true,
                        action: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      permissionVersion: user.permissionVersion,

      userId: user.id,

      status: user.status,

      roles: user.roles.map(({ role }) => ({
        id: role.id,

        name: role.name,

        permissions: role.permissions.map(({ permission }) => ({
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
        })),
      })),
    };
  }

  async incrementPermissionVersion(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        permissionVersion: {
          increment: 1,
        },
      },
    });
  }

  async findUserWithRoles(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findRolePermissions(roleId: string) {
    return this.prisma.role.findUnique({
      where: {
        id: roleId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findUserPermissions(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findPermissionByName(name: string) {
    return this.prisma.permission.findUnique({
      where: {
        name,
      },
    });
  }

  async findUsersByRole(roleId: string) {
    return this.prisma.role.findUnique({
      where: {
        id: roleId,
      },

      select: {
        users: {
          select: {
            userId: true,
          },
        },
      },
    });
  }

  // =====================================================
  // Create Role Permission
  // =====================================================

  createRolePermission(data: Prisma.RolePermissionCreateInput) {
    return this.prisma.rolePermission.create({
      data,
    });
  }

  // =====================================================
  // Create Multiple Role Permissions
  // =====================================================

  createManyRolePermissions(data: Prisma.RolePermissionCreateManyInput[]) {
    return this.prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });
  }

  // =====================================================
  // Delete Role Permission
  // =====================================================

  deleteRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
  }

  // =====================================================
  // Delete All Permissions Of Role
  // =====================================================

  deleteRolePermissionsByRole(roleId: string) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
      },
    });
  }

  async createAuditLog(data: {
    actorId?: string;

    action: string;

    targetUserId?: string;

    roleId?: string;

    permissionId?: string;

    metadata?: object;
  }) {
    return this.prisma.authorizationAuditLog.create({
      data,
    });
  }
}
