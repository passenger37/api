import { Injectable } from '@nestjs/common';

import { Prisma, ReportStatus, UserReportReason } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class UserReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      serverId: string;
      reporterMemberId: string;
      targetUserId: string;
      reason: UserReportReason;
      detailText?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.userReport.create({
      data,
    });
  }

  async findByReporterAndTarget(
    reporterMemberId: string,
    targetUserId: string,
  ) {
    return this.prisma.userReport.findUnique({
      where: {
        reporterMemberId_targetUserId: {
          reporterMemberId,
          targetUserId,
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.userReport.findUnique({
      where: {
        id,
      },
    });
  }

  async listByServer(
    serverId: string,
    options: {
      status?: ReportStatus;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    const { status, cursorId, limit = 50 } = options;

    return this.prisma.userReport.findMany({
      where: {
        serverId,

        ...(status ? { status } : {}),

        ...(cursorId
          ? {
              id: {
                gt: cursorId,
              },
            }
          : {}),
      },

      include: {
        target: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },

        reporter: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },

        handledBy: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },

      orderBy: {
        id: 'asc',
      },

      take: limit,
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: ReportStatus;
      handledByMemberId: string;
      handledAt: Date;
      detailText?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.userReport.update({
      where: {
        id,
      },

      data,
    });
  }
}
