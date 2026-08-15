import { Injectable } from '@nestjs/common';
import { Prisma, ServerInvite } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';

@Injectable()
export class ServerInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerInviteCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ServerInvite> {
    const client = tx ?? this.prisma;

    return client.serverInvite.create({
      data,
    });
  }

  async findByCode(code: string): Promise<ServerInvite | null> {
    return this.prisma.serverInvite.findUnique({
      where: {
        code,
      },
    });
  }

  async findByCodeWithServer(code: string) {
    return this.prisma.serverInvite.findUnique({
      where: {
        code,
      },

      include: {
        server: true,
      },
    });
  }

  async findById(id: string): Promise<ServerInvite | null> {
    return this.prisma.serverInvite.findUnique({
      where: {
        id,
      },
    });
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await this.prisma.serverInvite.count({
      where: {
        code,
      },
    });

    return count > 0;
  }

  async findByServer(serverId: string): Promise<ServerInvite[]> {
    return this.prisma.serverInvite.findMany({
      where: {
        serverId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async incrementUses(
    inviteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.serverInvite.update({
      where: {
        id: inviteId,
      },
      data: {
        uses: {
          increment: 1,
        },
      },
    });
  }

  async revoke(id: string): Promise<ServerInvite> {
    return this.prisma.serverInvite.update({
      where: {
        id,
      },
      data: {
        revoked: true,
      },
    });
  }

  async delete(inviteId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.serverInvite.delete({
      where: {
        id: inviteId,
      },
    });
  }
}
