import { Injectable } from '@nestjs/common';
import { ChannelMessage, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ChannelMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ChannelMessageCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessage> {
    const client = tx ?? this.prisma;

    return client.channelMessage.create({
      data,
    });
  }

  async findById(id: string): Promise<ChannelMessage | null> {
    return this.prisma.channelMessage.findUnique({
      where: {
        id,
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.channelMessage.count({
      where: {
        id,
      },
    });

    return count > 0;
  }

  async findManyByChannel(
    channelId: string,
    skip = 0,
    take = 50,
  ): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        channelId,
        isDeleted: false,
      },

      orderBy: {
        createdAt: 'asc',
      },

      skip,
      take,
    });
  }

  async update(
    id: string,
    data: Prisma.ChannelMessageUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessage> {
    const client = tx ?? this.prisma;

    return client.channelMessage.update({
      where: {
        id,
      },

      data,
    });
  }

  async softDelete(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessage> {
    const client = tx ?? this.prisma;

    return client.channelMessage.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  async pin(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessage> {
    const client = tx ?? this.prisma;

    return client.channelMessage.update({
      where: {
        id,
      },

      data: {
        isPinned: true,
        pinnedAt: new Date(),
      },
    });
  }

  async unpin(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelMessage> {
    const client = tx ?? this.prisma;

    return client.channelMessage.update({
      where: {
        id,
      },

      data: {
        isPinned: false,
        pinnedAt: null,
      },
    });
  }

  async countChannelMessages(channelId: string): Promise<number> {
    return this.prisma.channelMessage.count({
      where: {
        channelId,
        isDeleted: false,
      },
    });
  }

  async findPinnedMessages(channelId: string): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        channelId,
        isPinned: true,
        isDeleted: false,
      },

      orderBy: {
        pinnedAt: 'desc',
      },
    });
  }

  async findReplies(parentMessageId: string): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        parentMessageId,
        isDeleted: false,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
