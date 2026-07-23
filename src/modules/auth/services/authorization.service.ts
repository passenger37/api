import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/index';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
      },

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
    });

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return [...permissions];
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
      },

      include: {
        role: true,
      },
    });

    return roles.map((r) => r.role.name);
  }
}
