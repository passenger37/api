import { Injectable } from '@nestjs/common';
import { CommunityPostEditHistory, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommunityPostEditHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    postId: string,
    previousContent: string,
    editedByUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostEditHistory> {
    const client = tx ?? this.prisma;

    return client.communityPostEditHistory.create({
      data: {
        postId,
        previousContent,
        editedByUserId,
      },
    });
  }

  async listByPost(
    postId: string,
    offset = 0,
    limit = 50,
  ): Promise<CommunityPostEditHistory[]> {
    return this.prisma.communityPostEditHistory.findMany({
      where: { postId },
      orderBy: [{ editedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
    });
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.communityPostEditHistory.count({
      where: { postId },
    });
  }

  async countRecent(
    postId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.communityPostEditHistory.count({
      where: {
        postId,
        editedAt: { gte: since },
      },
    });
  }

  async deleteOldForPost(
    postId: string,
    keepFrom: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.communityPostEditHistory.deleteMany({
      where: {
        postId,
        editedAt: { lt: keepFrom },
      },
    });

    return result.count;
  }
}