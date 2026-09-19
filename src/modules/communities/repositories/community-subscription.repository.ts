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

  async isSubscribed(communityId: string, userId: string): Promise<boolean> {
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

  async isMuted(communityId: string, userId: string): Promise<boolean> {
    const subscription = await this.prisma.communitySubscription.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { isMuted: true },
    });

    return subscription?.isMuted ?? false;
  }

  /**
   * List every subscription for a community. Used by the realtime room
   * resolver to compute the audience for a community event. Returns the
   * raw rows so the caller can apply mute/role filters without the
   * repository baking policy in.
   */
  async listForCommunity(
    communityId: string,
  ): Promise<CommunitySubscription[]> {
    return this.prisma.communitySubscription.findMany({
      where: { communityId },
    });
  }

  /**
   * Atomically flip the muted flag. Returns the updated row, or null if no
   * subscription exists for (communityId, userId).
   */
  async setMuted(
    communityId: string,
    userId: string,
    isMuted: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunitySubscription | null> {
    const client = tx ?? this.prisma;

    try {
      return await client.communitySubscription.update({
        where: { communityId_userId: { communityId, userId } },
        data: { isMuted },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }
}
