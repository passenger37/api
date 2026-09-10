import { Injectable } from '@nestjs/common';
import { Prisma, PostReport, ReportStatus, PostReportReason, User } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { POST_REPORT_SELECT } from '../constants/post.select';

@Injectable()
export class PostReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      postId: string;
      reporterUserId: string;
      reason: PostReportReason;
      detailText?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PostReport> {
    const client = tx ?? this.prisma;

    return client.postReport.create({
      data,
      select: POST_REPORT_SELECT,
    });
  }

  async findById(id: string): Promise<PostReport | null> {
    return this.prisma.postReport.findUnique({
      where: { id },
      select: POST_REPORT_SELECT,
    });
  }

  async findByPostAndReporter(
    postId: string,
    reporterUserId: string,
  ): Promise<PostReport | null> {
    return this.prisma.postReport.findUnique({
      where: { postId_reporterUserId: { postId, reporterUserId } },
      select: POST_REPORT_SELECT,
    });
  }

  async findByPost(
    postId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
      status?: ReportStatus;
    },
  ): Promise<{ items: (PostReport & { reporter: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean }; handledBy: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null })[]; nextCursor: { createdAt: Date; id: string } | null }> {
    const where: Prisma.PostReportWhereInput = { postId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const reports = await this.prisma.postReport.findMany({
      where,
      select: POST_REPORT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = reports.length > options.limit;
    const items = hasMore ? reports.slice(0, options.limit) : reports;
    const nextCursor = hasMore && items.length > 0
      ? { createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id }
      : null;

    return { items, nextCursor };
  }

  async findPendingReports(
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{ items: (PostReport & { reporter: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean }; handledBy: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null })[]; nextCursor: { createdAt: Date; id: string } | null }> {
    return this.findByPost('', { cursor: options.cursor, limit: options.limit, status: ReportStatus.PENDING });
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    handledByUserId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PostReport> {
    const client = tx ?? this.prisma;

    return client.postReport.update({
      where: { id },
      data: {
        status,
        handledByUserId,
        handledAt: new Date(),
      },
      select: POST_REPORT_SELECT,
    });
  }

  async countByStatus(status: ReportStatus): Promise<number> {
    return this.prisma.postReport.count({ where: { status } });
  }
}