import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PostReportReason,
  ReportStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import { COMMUNITY_POST_REPORT_SELECT } from '../constants/community-post.select';

export type CommunityPostReportSelectRow = Prisma.CommunityPostReportGetPayload<{
  select: typeof COMMUNITY_POST_REPORT_SELECT;
}>;

export interface CommunityPostReportInput {
  postId: string;
  reporterUserId: string;
  reason: PostReportReason;
  detailText?: string;
}

@Injectable()
export class CommunityPostReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CommunityPostReportInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostReportSelectRow> {
    const client = tx ?? this.prisma;

    return client.communityPostReport.create({
      data: {
        postId: data.postId,
        reporterUserId: data.reporterUserId,
        reason: data.reason,
        detailText: data.detailText ?? null,
      },
      select: COMMUNITY_POST_REPORT_SELECT,
    });
  }

  async findById(id: string): Promise<CommunityPostReportSelectRow | null> {
    return this.prisma.communityPostReport.findUnique({
      where: { id },
      select: COMMUNITY_POST_REPORT_SELECT,
    });
  }

  async findByPostAndReporter(
    postId: string,
    reporterUserId: string,
  ): Promise<CommunityPostReportSelectRow | null> {
    return this.prisma.communityPostReport.findUnique({
      where: { postId_reporterUserId: { postId, reporterUserId } },
      select: COMMUNITY_POST_REPORT_SELECT,
    });
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    handledByUserId: string,
  ): Promise<CommunityPostReportSelectRow> {
    return this.prisma.communityPostReport.update({
      where: { id },
      data: {
        status,
        handledByUserId,
        handledAt: new Date(),
      },
      select: COMMUNITY_POST_REPORT_SELECT,
    });
  }

  async listByPost(
    postId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityPostReportSelectRow[]> {
    return this.prisma.communityPostReport.findMany({
      where: { postId, ...this.cursorWhere(cursor) },
      select: COMMUNITY_POST_REPORT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async listByCommunity(
    communityId: string,
    postIds: string[],
    status: ReportStatus | undefined,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityPostReportSelectRow[]> {
    return this.prisma.communityPostReport.findMany({
      where: {
        postId: { in: postIds },
        ...(status ? { status } : {}),
        ...this.cursorWhere(cursor),
      },
      select: COMMUNITY_POST_REPORT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.communityPostReport.count({
      where: { postId },
    });
  }

  private cursorWhere(cursor?: TwoFieldCursor): Prisma.CommunityPostReportWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
        },
      ],
    };
  }
}