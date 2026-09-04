import { Injectable } from '@nestjs/common';
import { CommunitySubscription, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommunitySubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(
    communityId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunitySubscription> {
    const client = tx ?? this.prisma;

    return client.communitySubscription.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId },
      update: { isMuted: false },
    });
  }

  async unsubscribe(
    communityId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communitySubscription.deleteMany({
      where: { communityId, userId },
    });
  }

  async isSubscribed(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const subscription = await this.prisma.communitySubscription.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });

    return Boolean(subscription);
  }

  async find(
    communityId: string,
    userId: string,
  ): Promise<CommunitySubscription | null> {
    return this.prisma.communitySubscription.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
  }

  async setMuted(
    communityId: string,
    userId: string,
    isMuted: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunitySubscription | null> {
    const client = tx ?? this.prisma;

    const subscription = await client.communitySubscription.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });

    if (!subscription) {
      return null;
    }

    return client.communitySubscription.update({
      where: { id: subscription.id },
      data: { isMuted },
    });
  }
}
