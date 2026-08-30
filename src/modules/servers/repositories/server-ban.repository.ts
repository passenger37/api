import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerBanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByServerAndUser(
    serverId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.serverBan.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });
  }

  async create(
    data: {
      serverId: string;
      userId: string;
      bannedById: string;
      reason?: string | null;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverBan.create({
      data,
    });
  }

  async deleteByServerAndUser(
    serverId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.serverBan.deleteMany({
      where: {
        serverId,
        userId,
      },
    });
  }

  async listByServer(serverId: string, cursorId?: string, limit = 50) {
    return this.prisma.serverBan.findMany({
      where: {
        serverId,

        ...(cursorId
          ? {
              id: {
                gt: cursorId,
              },
            }
          : {}),
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },

      orderBy: {
        id: 'asc',
      },

      take: limit,
    });
  }
}
