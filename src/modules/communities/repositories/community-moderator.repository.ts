import { Injectable } from '@nestjs/common';
import {
  CommunityModerator,
  CommunityModeratorRole,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommunityModeratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    communityId: string,
    userId: string,
    role: CommunityModeratorRole,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityModerator> {
    const client = tx ?? this.prisma;

    return client.communityModerator.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId, role },
      update: { role },
    });
  }

  async remove(
    communityId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityModerator.deleteMany({ where: { communityId, userId } });
  }

  async find(
    communityId: string,
    userId: string,
  ): Promise<CommunityModerator | null> {
    return this.prisma.communityModerator.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
  }

  async isAdmin(communityId: string, userId: string): Promise<boolean> {
    const moderator = await this.prisma.communityModerator.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });

    return moderator?.role === CommunityModeratorRole.ADMIN;
  }

  async list(communityId: string): Promise<CommunityModerator[]> {
    return this.prisma.communityModerator.findMany({
      where: { communityId },
      orderBy: { assignedAt: 'asc' },
    });
  }
}
