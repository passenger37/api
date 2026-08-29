import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ChannelReadStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByChannelAndMember(channelId: string, memberId: string) {
    return this.prisma.channelReadState.findUnique({
      where: {
        channelId_memberId: {
          channelId,
          memberId,
        },
      },
    });
  }

  async upsert(
    channelId: string,
    memberId: string,
    data: {
      lastReadMessageId: string | null;
      lastReadAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.channelReadState.upsert({
      where: {
        channelId_memberId: {
          channelId,
          memberId,
        },
      },
      create: {
        channelId,
        memberId,
        ...data,
      },
      update: {
        ...data,
      },
    });
  }

  async countUnreadAfter(channelId: string, afterCreatedAt: Date | null) {
    return this.prisma.channelMessage.count({
      where: {
        channelId,
        isDeleted: false,
        ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}),
      },
    });
  }

  async findLatestMessage(channelId: string) {
    return this.prisma.channelMessage.findFirst({
      where: {
        channelId,
        isDeleted: false,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
