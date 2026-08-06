import { Injectable } from '@nestjs/common';
import { Prisma, ServerPermission } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerRolePermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerRolePermissionCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverRolePermission.create({
      data,
    });
  }

  async findPermissionsByRoles(roleIds: string[]): Promise<ServerPermission[]> {
    const permissions = await this.prisma.serverRolePermission.findMany({
      where: {
        roleId: {
          in: roleIds,
        },
      },
      select: {
        permission: true,
      },
    });

    return permissions.map((p) => p.permission);
  }

  async replacePermissions(
    roleId: string,
    permissions: ServerPermission[],
    tx: Prisma.TransactionClient,
  ) {
    await tx.serverRolePermission.deleteMany({
      where: {
        roleId,
      },
    });

    if (permissions.length === 0) {
      return;
    }

    await tx.serverRolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permission,
      })),
    });
  }
}
