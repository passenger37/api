import { Injectable } from '@nestjs/common';
import { DirectMessageReadState, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DirectMessageReadStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(channelId: string, userId: string) {
    return this.prisma.directMessageReadState.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });
  }

  async upsert(
    channelId: string,
    userId: string,
    cursor: {
      lastReadMessageId: string | null;
      lastReadAt: Date;
      unreadCount: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<DirectMessageReadState> {
    const client = tx ?? this.prisma;

    return client.directMessageReadState.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },

      create: {
        channel: {
          connect: {
            id: channelId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        ...(cursor.lastReadMessageId
          ? {
              lastReadMessage: {
                connect: {
                  id: cursor.lastReadMessageId,
                },
              },
            }
          : {}),
        lastReadAt: cursor.lastReadAt,
        unreadCount: cursor.unreadCount,
      },

      update: {
        ...(cursor.lastReadMessageId
          ? {
              lastReadMessage: {
                connect: {
                  id: cursor.lastReadMessageId,
                },
              },
            }
          : {}),
        lastReadAt: cursor.lastReadAt,
        unreadCount: cursor.unreadCount,
      },
    });
  }

  async findForUser(
    userId: string,
    channelIds: string[],
  ): Promise<DirectMessageReadState[]> {
    if (channelIds.length === 0) {
      return [];
    }

    return this.prisma.directMessageReadState.findMany({
      where: {
        userId,
        channelId: {
          in: channelIds,
        },
      },
    });
  }

  async countUnreadAfter(
    channelId: string,
    lastReadAt: Date,
    excludeAuthorId: string,
  ): Promise<number> {
    return this.prisma.directMessage.count({
      where: {
        channelId,
        isDeleted: false,
        authorUserId: {
          not: excludeAuthorId,
        },
        createdAt: {
          gt: lastReadAt,
        },
      },
    });
  }
}
