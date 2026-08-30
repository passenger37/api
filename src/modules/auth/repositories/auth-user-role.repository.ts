import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class AuthUserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserRolesWithPermissions(userId: string) {
    return this.prisma.userRole.findMany({
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
  }

  findUserRolesWithRole(userId: string) {
    return this.prisma.userRole.findMany({
      where: {
        userId,
      },

      include: {
        role: true,
      },
    });
  }
}
