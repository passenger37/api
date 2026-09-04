import { Injectable } from '@nestjs/common';
import {
  CommunityModerationAction,
  CommunityModerationActionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
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
    cursor?: string,
  ): Promise<CommunityModerationHistoryRow[]> {
    return this.prisma.communityModerationAction.findMany({
      where: { communityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
  }

  async listByActionType(
    communityId: string,
    actionType: CommunityModerationActionType,
    limit: number,
    cursor?: string,
  ): Promise<CommunityModerationHistoryRow[]> {
    return this.prisma.communityModerationAction.findMany({
      where: { communityId, actionType },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
  }

  async countByCommunity(communityId: string): Promise<number> {
    return this.prisma.communityModerationAction.count({ where: { communityId } });
  }
}
