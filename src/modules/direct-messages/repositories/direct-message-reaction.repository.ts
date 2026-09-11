import { Injectable } from '@nestjs/common';
import { DirectMessageReaction } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DirectMessageReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<DirectMessageReaction> {
    return this.prisma.directMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  async remove(messageId: string, userId: string, emoji: string) {
    return this.prisma.directMessageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });
  }

  async find(messageId: string, userId: string, emoji: string) {
    return this.prisma.directMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });
  }

  async findByMessage(messageId: string): Promise<DirectMessageReaction[]> {
    return this.prisma.directMessageReaction.findMany({
      where: {
        messageId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Batch grouped reaction counts for many messages in a single query.
   * Returns `Map<messageId, Map<emoji, number>>`.
   */
  async countReactionsByMessages(
    messageIds: string[],
  ): Promise<Map<string, Map<string, number>>> {
    if (messageIds.length === 0) {
      return new Map();
    }

    const groups = await this.prisma.directMessageReaction.groupBy({
      by: ['messageId', 'emoji'],
      where: {
        messageId: {
          in: messageIds,
        },
      },
      _count: {
        _all: true,
      },
    });

    const counts = new Map<string, Map<string, number>>();

    for (const group of groups) {
      const byEmoji = counts.get(group.messageId) ?? new Map<string, number>();
      byEmoji.set(group.emoji, group._count._all);
      counts.set(group.messageId, byEmoji);
    }

    return counts;
  }

  /**
   * Batch the set of emojis a given viewer reacted with, across many messages.
   * Returns `Map<messageId, Set<emoji>>`.
   */
  async viewerReactions(
    messageIds: string[],
    viewerUserId: string,
  ): Promise<Map<string, Set<string>>> {
    if (messageIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.directMessageReaction.findMany({
      where: {
        messageId: {
          in: messageIds,
        },
        userId: viewerUserId,
      },
      select: {
        messageId: true,
        emoji: true,
      },
    });

    const result = new Map<string, Set<string>>();

    for (const row of rows) {
      const set = result.get(row.messageId) ?? new Set<string>();
      set.add(row.emoji);
      result.set(row.messageId, set);
    }

    return result;
  }
}
