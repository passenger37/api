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
}
