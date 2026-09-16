import { Injectable } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, DmReport } from '@prisma/client';

/**
 * Persists user-initiated reports about a direct message. For PRIVATE_E2EE
 * channels the server never reads plaintext — the reporting client decrypts the
 * message locally and deliberately includes decrypted content + report choice
 * as an opaque `reportPackage` (spec #38 "Reporting an E2EE Message"). The
 * server stores the package verbatim; it never proactively decrypts DM content.
 */
@Injectable()
export class DmReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    channelId: string;
    messageId: string;
    reporterUserId: string;
    targetUserId: string;
    reason: string;
    reportPackage?: string | null;
  }): Promise<DmReport> {
    return this.prisma.dmReport.create({
      data: {
        channelId: data.channelId,
        messageId: data.messageId,
        reporterUserId: data.reporterUserId,
        targetUserId: data.targetUserId,
        reason: data.reason as never,
        reportPackage: data.reportPackage ?? '',
      },
    });
  }

  async findById(id: string): Promise<DmReport | null> {
    return this.prisma.dmReport.findUnique({ where: { id } });
  }

  async findByMessageAndReporter(
    messageId: string,
    reporterUserId: string,
  ): Promise<DmReport | null> {
    return this.prisma.dmReport.findUnique({
      where: {
        messageId_reporterUserId: {
          messageId,
          reporterUserId,
        },
      },
    });
  }

  async listByChannel(
    channelId: string,
    options: {
      status?: ReportStatus;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    const { status, cursorId, limit = 50 } = options;
    return this.prisma.dmReport.findMany({
      where: {
        channelId,
        ...(status ? { status } : {}),
        ...(cursorId ? { id: { lt: cursorId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        target: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async countByStatus(status: ReportStatus) {
    return this.prisma.dmReport.count({ where: { status } });
  }

  async updateStatus(
    id: string,
    data: {
      status: ReportStatus;
      handledByUserId: string | null;
      handledAt?: Date | null;
    },
  ) {
    return this.prisma.dmReport.update({
      where: { id },
      data: {
        status: data.status,
        handledByUserId: data.handledByUserId,
        handledAt: data.handledAt ?? new Date(),
      },
    });
  }
}
