import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ChannelMessageReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addReaction(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.create({
      data: {
        messageId,
        memberId,
        emoji,
      },
    });
  }

  async removeReaction(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.delete({
      where: {
        messageId_memberId_emoji: {
          messageId,
          memberId,
          emoji,
        },
      },
    });
  }

  async findReaction(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.findUnique({
      where: {
        messageId_memberId_emoji: {
          messageId,
          memberId,
          emoji,
        },
      },
    });
  }

  async getMessageReactions(messageId: string) {
    return this.prisma.channelMessageReaction.findMany({
      where: {
        messageId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async create(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.create({
      data: {
        messageId,
        memberId,
        emoji,
      },
    });
  }

  async delete(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.delete({
      where: {
        messageId_memberId_emoji: {
          messageId,
          memberId,
          emoji,
        },
      },
    });
  }

  async find(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.findUnique({
      where: {
        messageId_memberId_emoji: {
          messageId,
          memberId,
          emoji,
        },
      },
    });
  }

  async findByMessage(messageId: string) {
    return this.prisma.channelMessageReaction.findMany({
      where: {
        messageId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(messageId: string, memberId: string, emoji: string) {
    return this.prisma.channelMessageReaction.findUnique({
      where: {
        messageId_memberId_emoji: {
          messageId,
          memberId,
          emoji,
        },
      },
    });
  }

  /**
   * Batch reaction counts grouped by emoji for many messages in one query.
   * Returns `Map<messageId, Map<emoji, count>>`.
   */
  async countReactionsByMessages(
    messageIds: string[],
  ): Promise<Map<string, Map<string, number>>> {
    if (messageIds.length === 0) {
      return new Map();
    }

    const groups = await this.prisma.channelMessageReaction.groupBy({
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
}
