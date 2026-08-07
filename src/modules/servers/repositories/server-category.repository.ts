import { Injectable } from '@nestjs/common';

import { Prisma, ServerCategory } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerCategoryCreateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerCategory> {
    return prisma.serverCategory.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.ServerCategoryUpdateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerCategory> {
    return prisma.serverCategory.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(
    id: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ServerCategory> {
    return prisma.serverCategory.delete({
      where: {
        id,
      },
    });
  }

  async findById(id: string): Promise<ServerCategory | null> {
    return this.prisma.serverCategory.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(
    serverId: string,
    name: string,
  ): Promise<ServerCategory | null> {
    return this.prisma.serverCategory.findFirst({
      where: {
        serverId,
        name,
      },
    });
  }

  async findMany(serverId: string): Promise<ServerCategory[]> {
    return this.prisma.serverCategory.findMany({
      where: {
        serverId,
      },
      orderBy: {
        position: 'asc',
      },
    });
  }

  async getHighestPosition(serverId: string): Promise<number> {
    const category = await this.prisma.serverCategory.findFirst({
      where: {
        serverId,
      },
      orderBy: {
        position: 'desc',
      },
    });

    return category?.position ?? 0;
  }

  async count(serverId: string): Promise<number> {
    return this.prisma.serverCategory.count({
      where: {
        serverId,
      },
    });
  }
}
