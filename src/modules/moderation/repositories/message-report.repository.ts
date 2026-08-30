import { Injectable } from '@nestjs/common';

import { MessageReportReason, Prisma, ReportStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class MessageReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      serverId: string;
      channelId: string;
      messageId: string;
      reporterMemberId: string;
      reason: MessageReportReason;
      detailText?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.messageReport.create({
      data,
    });
  }

  async findByMessageAndReporter(messageId: string, reporterMemberId: string) {
    return this.prisma.messageReport.findUnique({
      where: {
        messageId_reporterMemberId: {
          messageId,
          reporterMemberId,
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.messageReport.findUnique({
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

    return this.prisma.messageReport.findMany({
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
        message: {
          select: {
            id: true,
            content: true,
            authorMemberId: true,
            createdAt: true,
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

    return client.messageReport.update({
      where: {
        id,
      },

      data,
    });
  }
}
