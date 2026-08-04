import { Injectable } from '@nestjs/common';
import { Prisma, Server } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    data: Prisma.ServerCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Server> {
    const client = tx ?? this.prisma;

    return client.server.create({
      data,
    });
  }

  async findBySlug(
    slug: string,
  ): Promise<Server | null> {
    return this.prisma.server.findUnique({
      where: {
        slug,
      },
    });
  }

  async existsBySlug(
    slug: string,
  ): Promise<boolean> {
    const count = await this.prisma.server.count({
      where: {
        slug,
      },
    });

    return count > 0;
  }
}