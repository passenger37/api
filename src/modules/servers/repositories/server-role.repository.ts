import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerRoleCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverRole.create({
      data,

      include: {
        permissions: true,
      },
    });
  }

  async findByName(
    serverId: string,
    name: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverRole.findFirst({
      where: {
        serverId,
        name,
      },
    });
  }

  async findById(roleId: string) {
    return this.prisma.serverRole.findUnique({
      where: {
        id: roleId,
      },

      include: {
        permissions: true,
      },
    });
  }

  async exists(roleId: string): Promise<boolean> {
    const count = await this.prisma.serverRole.count({
      where: {
        id: roleId,
      },
    });

    return count > 0;
  }

  async findByServer(serverId: string) {
    return this.prisma.serverRole.findMany({
      where: {
        serverId,
      },

      include: {
        permissions: true,
      },

      orderBy: [
        {
          position: 'desc',
        },

        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async countByServer(serverId: string): Promise<number> {
    return this.prisma.serverRole.count({
      where: {
        serverId,
      },
    });
  }

  async getHighestPosition(serverId: string): Promise<number> {
    const role = await this.prisma.serverRole.findFirst({
      where: {
        serverId,
      },

      orderBy: {
        position: 'desc',
      },
    });

    return role?.position ?? 0;
  }

  async getLowestPosition(serverId: string): Promise<number> {
    const role = await this.prisma.serverRole.findFirst({
      where: {
        serverId,
      },

      orderBy: {
        position: 'asc',
      },
    });

    return role?.position ?? 0;
  }

  async existsByName(serverId: string, name: string): Promise<boolean> {
    const count = await this.prisma.serverRole.count({
      where: {
        serverId,
        name,
      },
    });

    return count > 0;
  }

  async update(
    roleId: string,
    data: Prisma.ServerRoleUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverRole.update({
      where: {
        id: roleId,
      },
      data,
      include: {
        permissions: true,
      },
    });
  }

  async delete(roleId: string, tx: Prisma.TransactionClient) {
    return tx.serverRole.delete({
      where: {
        id: roleId,
      },
    });
  }

  async updatePosition(
    roleId: string,
    position: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverRole.update({
      where: {
        id: roleId,
      },

      data: {
        position,
      },
    });
  }
}
