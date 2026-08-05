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

  async existsByCode(code: string): Promise<boolean> {
    const count = await this.prisma.serverInvite.count({
      where: {
        code,
      },
    });

    return count > 0;
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

  async delete(inviteId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.serverInvite.delete({
      where: {
        id: inviteId,
      },
    });
  }
}
