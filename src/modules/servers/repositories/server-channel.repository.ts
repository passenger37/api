import { Injectable } from '@nestjs/common';

import { Prisma, ServerChannel } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerChannelCreateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerChannel> {
    return prisma.serverChannel.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.ServerChannelUpdateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerChannel> {
    return prisma.serverChannel.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(
    id: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerChannel> {
    return prisma.serverChannel.delete({
      where: {
        id,
      },
    });
  }

  async findById(id: string): Promise<ServerChannel | null> {
    return this.prisma.serverChannel.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(
    serverId: string,
    name: string,
  ): Promise<ServerChannel | null> {
    return this.prisma.serverChannel.findFirst({
      where: {
        serverId,
        name,
      },
    });
  }

  async findMany(serverId: string): Promise<ServerChannel[]> {
    return this.prisma.serverChannel.findMany({
      where: {
        serverId,
      },
      orderBy: [
        {
          position: 'asc',
        },
      ],
    });
  }

  async getHighestPosition(serverId: string): Promise<number> {
    const channel = await this.prisma.serverChannel.findFirst({
      where: {
        serverId,
      },
      orderBy: {
        position: 'desc',
      },
    });

    return channel?.position ?? 0;
  }

  async search(serverId: string, query: string): Promise<ServerChannel[]> {
    return this.prisma.serverChannel.findMany({
      where: {
        serverId,

        name: {
          contains: query,
          mode: 'insensitive',
        },
      },

      orderBy: {
        position: 'asc',
      },
    });
  }
}
