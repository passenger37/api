import { Injectable } from '@nestjs/common';
import { Prisma, Server } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Server> {
    const client = tx ?? this.prisma;

    return client.server.create({
      data,
    });
  }

  async findBySlug(slug: string): Promise<Server | null> {
    return this.prisma.server.findUnique({
      where: {
        slug,
      },
    });
  }

  async findMany(args?: Prisma.ServerFindManyArgs): Promise<Server[]> {
    return this.prisma.server.findMany(args);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.server.count({
      where: {
        slug,
      },
    });

    return count > 0;
  }
  async findById(id: string) {
    return this.prisma.server.findUnique({
      where: { id },
    });
  }

  async search(query: string | undefined, skip: number, take: number) {
    return this.prisma.server.findMany({
      where: {
        visibility: 'PUBLIC',

        ...(query
          ? {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  slug: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: {
        createdAt: 'desc',
      },

      skip,

      take,
    });
  }

  async countSearchResults(query?: string): Promise<number> {
    return this.prisma.server.count({
      where: {
        visibility: 'PUBLIC',

        ...(query
          ? {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  slug: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
    });
  }
}
