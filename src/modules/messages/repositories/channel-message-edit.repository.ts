import { Injectable } from '@nestjs/common';
import { ChannelMessageEdit, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ChannelMessageEditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ChannelMessageEditCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessageEdit> {
    const client = tx ?? this.prisma;

    return client.channelMessageEdit.create({
      data,
    });
  }

  // Cursor pagination ordered by editedAt DESC, id DESC
  // Recommended composite index: (messageId, editedAt DESC, id DESC)
  async findManyByMessagePaginated(
    messageId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChannelMessageEdit[]> {
    return this.prisma.channelMessageEdit.findMany({
      where: {
        messageId,
      },

      orderBy: [{ editedAt: 'desc' }, { id: 'desc' }],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,
    });
  }

  async countByMessage(messageId: string): Promise<number> {
    return this.prisma.channelMessageEdit.count({
      where: {
        messageId,
      },
    });
  }
}
