import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageReportReason, ReportStatus } from '@prisma/client';

import { CreateDmReportRequest } from '../dto/request/create-dm-report.request';
import { DmReportRepository } from '../repositories/dm-report.repository';
import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { serializeDmReport } from '../serializers/dm-report.serializer';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DmReportCommandService {
  constructor(
    private readonly reportRepository: DmReportRepository,
    private readonly messageRepository: DirectMessageRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Submit a report for a direct message (spec #38 "Reporting an E2EE
   * Message"). For PRIVATE_E2EE channels the reporting client decrypts locally
   * and deliberately includes decrypted content + report choice as the opaque
   * `reportPackage`; the server stores it verbatim and never proactively reads
   * DM plaintext. Deduplicated per (message, reporter).
   */
  async submit(request: CreateDmReportRequest, reporterUserId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: request.messageId },
    });

    if (!message || message.channelId !== request.channelId) {
      throw new BadRequestException('Message does not exist in this channel.');
    }

    if (message.authorUserId === reporterUserId) {
      throw new BadRequestException('You cannot report your own message.');
    }

    const existing = await this.reportRepository.findByMessageAndReporter(
      request.messageId,
      reporterUserId,
    );

    if (existing) {
      throw new BadRequestException('You have already reported this message.');
    }

    const report = await this.reportRepository.create({
      channelId: request.channelId,
      messageId: request.messageId,
      reporterUserId,
      targetUserId: message.authorUserId,
      reason: request.reason,
      reportPackage: request.reportPackage,
    });

    return serializeDmReport(report);
  }

  /** Resolve a DM report (marks it handled/resolved, sets handler metadata). */
  async resolve(
    reportId: string,
    handledByUserId: string,
    status: ReportStatus,
  ) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    const updated = await this.reportRepository.updateStatus(reportId, {
      handledByUserId,
      status,
    });

    return serializeDmReport(updated);
  }

  async listByChannel(
    channelId: string,
    status: ReportStatus | undefined,
    cursorId: string | undefined,
    limit = 50,
  ) {
    const reports = await this.reportRepository.listByChannel(channelId, {
      status,
      cursorId,
      limit,
    });
    return reports.map((report) => serializeDmReport(report));
  }
}
