import { Injectable } from '@nestjs/common';
import {
  CommunityModerationAction,
  CommunityModerationActionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import { CommunityModerationHistoryRow } from '../types/community.types';

@Injectable()
export class CommunityModerationActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityModerationActionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityModerationAction> {
    const client = tx ?? this.prisma;

    return client.communityModerationAction.create({ data });
  }

  async list(
    communityId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityModerationHistoryRow[]> {
    return this.prisma.communityModerationAction.findMany({
      where: {
        communityId,
        ...this.cursorWhere(cursor),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  async listByActionType(
    communityId: string,
    actionType: CommunityModerationActionType,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityModerationHistoryRow[]> {
    return this.prisma.communityModerationAction.findMany({
      where: {
        communityId,
        actionType,
        ...this.cursorWhere(cursor),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  async countByCommunity(communityId: string): Promise<number> {
    return this.prisma.communityModerationAction.count({
      where: { communityId },
    });
  }

  async findLatest(
    communityId: string,
    targetUserId: string,
    actionType: CommunityModerationActionType,
  ): Promise<CommunityModerationAction | null> {
    return this.prisma.communityModerationAction.findFirst({
      where: { communityId, targetUserId, actionType },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Build a "rows strictly before this cursor in [createdAt desc, id desc]
   * order" predicate. Without this, two rows with identical `createdAt`
   * could split across pages because the underlying cursor index is `id`.
   */
  private cursorWhere(cursor?: TwoFieldCursor): Prisma.CommunityModerationActionWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          AND: [
            { createdAt: cursor.createdAt },
            { id: { lt: cursor.id } },
          ],
        },
      ],
    };
  }
}
