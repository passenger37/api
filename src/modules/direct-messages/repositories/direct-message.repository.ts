import { Injectable } from '@nestjs/common';
import { DirectMessage, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DirectMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.DirectMessageCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<DirectMessage> {
    const client = tx ?? this.prisma;

    return client.directMessage.create({
      data,
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.directMessage.findUnique({
      where: {
        id,
      },
    });
  }

  async findByClientMessageId(clientMessageId: string, authorUserId: string) {
    return this.prisma.directMessage.findFirst({
      where: {
        clientMessageId,
        authorUserId,
      },
    });
  }

  async findPage(
    channelId: string,
    cursor?: string,
    limit = 50,
  ): Promise<DirectMessage[]> {
    return this.prisma.directMessage.findMany({
      where: {
        channelId,
        isDeleted: false,
      },

      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,
    });
  }

  async findAfter(
    channelId: string,
    afterMessageId: string,
    take = 50,
  ): Promise<DirectMessage[]> {
    return this.prisma.directMessage.findMany({
      where: {
        channelId,
        isDeleted: false,
      },

      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      cursor: {
        id: afterMessageId,
      },

      skip: 1,
      take,
    });
  }

  async findLatestForRead(channelId: string) {
    return this.prisma.directMessage.findFirst({
      where: {
        channelId,
        isDeleted: false,
      },

      orderBy: [
        {
          messageSeq: 'desc',
        },
      ],
    });
  }

  async update(
    id: string,
    data: Prisma.DirectMessageUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<DirectMessage> {
    const client = tx ?? this.prisma;

    return client.directMessage.update({
      where: {
        id,
      },

      data,
    });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.directMessage.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
