import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { AuthorizationContext } from '../domain';

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
}
