import { Injectable } from '@nestjs/common';
import { DirectMessageMode, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

export function orderPair(
  userAId: string,
  userBId: string,
): {
  userAId: string;
  userBId: string;
} {
  return userAId < userBId
    ? { userAId, userBId }
    : { userAId: userBId, userBId: userAId };
}

const CHANNEL_INCLUDE = {
  userA: true,
  userB: true,
} satisfies Prisma.DirectMessageChannelInclude;

export type ChannelWithUsers = Prisma.DirectMessageChannelGetPayload<{
  include: typeof CHANNEL_INCLUDE;
}>;

@Injectable()
export class DirectMessageChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPair(
    userAId: string,
    userBId: string,
  ): Promise<ChannelWithUsers | null> {
    const { userAId: a, userBId: b } = orderPair(userAId, userBId);

    return this.prisma.directMessageChannel.findUnique({
      where: {
        userAId_userBId: {
          userAId: a,
          userBId: b,
        },
      },

      include: CHANNEL_INCLUDE,
    });
  }

  async create(
    userAId: string,
    userBId: string,
    mode: DirectMessageMode = DirectMessageMode.STANDARD,
    tx?: Prisma.TransactionClient,
  ): Promise<ChannelWithUsers> {
    const client = tx ?? this.prisma;

    const { userAId: a, userBId: b } = orderPair(userAId, userBId);

    return client.directMessageChannel.create({
      data: {
        userAId: a,
        userBId: b,
        mode,
      },

      include: CHANNEL_INCLUDE,
    });
  }

  async findById(channelId: string): Promise<ChannelWithUsers | null> {
    return this.prisma.directMessageChannel.findUnique({
      where: {
        id: channelId,
      },

      include: CHANNEL_INCLUDE,
    });
  }

  async listForUser(
    userId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChannelWithUsers[]> {
    return this.prisma.directMessageChannel.findMany({
      where: {
        OR: [
          {
            userAId: userId,
          },
          {
            userBId: userId,
          },
        ],
      },

      orderBy: [
        {
          lastMessageAt: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,

      include: CHANNEL_INCLUDE,
    });
  }

  async incrementCounterAndTouch(
    channelId: string,
    at: Date,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const updated = await tx.directMessageChannel.update({
      where: {
        id: channelId,
      },

      data: {
        messageCounter: {
          increment: 1,
        },
        lastMessageAt: at,
      },
    });

    return updated.messageCounter;
  }

  async update(
    id: string,
    data: Prisma.DirectMessageChannelUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.directMessageChannel.update({
      where: { id },
      data,
    });
  }
}
