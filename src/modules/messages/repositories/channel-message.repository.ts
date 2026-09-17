import { Injectable } from '@nestjs/common';
import { ChannelMessage, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import {
  MessageSearchParams,
  MessageSearchQueryBuilder,
} from '../queries/message-search.query';

const MESSAGE_INCLUDE = {
  attachments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  author: {
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
  },
} satisfies Prisma.ChannelMessageInclude;

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

      include: MESSAGE_INCLUDE,
    });
  }

  async findById(messageId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.channelMessage.findUnique({
      where: {
        id: messageId,
      },

      include: MESSAGE_INCLUDE,
    });
  }

  async findByClientMessageId(clientMessageId: string, authorMemberId: string) {
    return this.prisma.channelMessage.findFirst({
      where: {
        clientMessageId,
        authorMemberId,
      },

      include: MESSAGE_INCLUDE,
    });
  }

  async findMessagesAfterCursor(
    channelId: string,
    afterMessageId: string,
    take = 50,
  ): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        channelId,
      },

      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],

      cursor: {
        id: afterMessageId,
      },

      skip: 1,
      take,

      include: MESSAGE_INCLUDE,
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

      include: MESSAGE_INCLUDE,
    });
  }

  // Cursor pagination ordered by createdAt DESC, id DESC
  // Recommended composite index: (channelId, createdAt DESC, id DESC) for optimal performance
  async findManyByChannelPaginated(
    channelId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        channelId,
        isDeleted: false,
      },

      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,

      include: MESSAGE_INCLUDE,
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

      include: MESSAGE_INCLUDE,
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

      include: MESSAGE_INCLUDE,
    });
  }

  async findRepliesPaginated(
    parentMessageId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChannelMessage[]> {
    return this.prisma.channelMessage.findMany({
      where: {
        parentMessageId,
        isDeleted: false,
      },

      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,

      include: MESSAGE_INCLUDE,
    });
  }

  async countReplies(parentMessageId: string): Promise<number> {
    return this.prisma.channelMessage.count({
      where: {
        parentMessageId,
        isDeleted: false,
      },
    });
  }

  async searchMessages(params: MessageSearchParams): Promise<ChannelMessage[]> {
    return this.prisma.$queryRaw<ChannelMessage[]>(
      MessageSearchQueryBuilder.build(params),
    );
  }
}
