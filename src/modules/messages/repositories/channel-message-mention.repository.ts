import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ResolvedMention } from '../services/channel-mention-resolver.service';

@Injectable()
export class ChannelMentionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    messageId: string,
    serverId: string,
    channelId: string,
    mentions: ResolvedMention[],
    tx?: Prisma.TransactionClient,
  ) {
    if (mentions.length === 0) {
      return;
    }

    const client = tx ?? this.prisma;

    return client.channelMention.createMany({
      data: mentions.map((mention) => ({
        messageId,
        serverId,
        channelId,
        mentionType: mention.mentionType,
        targetMemberId: mention.targetMemberId,
        targetRoleId: mention.targetRoleId,
      })),
    });
  }

  async deleteManyByMessage(messageId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.channelMention.deleteMany({
      where: { messageId },
    });
  }

  async findByMessage(messageId: string) {
    return this.prisma.channelMention.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countMentionsByMessages(messageIds: string[]) {
    const counts = new Map<string, number>();

    if (messageIds.length === 0) {
      return counts;
    }

    const groups = await this.prisma.channelMention.groupBy({
      by: ['messageId'],
      where: { messageId: { in: messageIds } },
      _count: { _all: true },
    });

    for (const group of groups) {
      counts.set(group.messageId, group._count._all);
    }

    return counts;
  }
}
