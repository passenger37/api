import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ReportStatus, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ChannelMessageQueryService } from '../../messages/services/channel-message-query.service';
import { ChannelMessageValidationService } from '../../messages/services/channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { ModerationAuditRepository } from '../../servers/repositories/moderation-audit.repository';

import { MessageReportRepository } from '../repositories/message-report.repository';
import { UserReportRepository } from '../repositories/user-report.repository';

import {
  serializeMessageReport,
  serializeUserReport,
} from '../serializers/report.serializer';

import { CreateMessageReportRequest } from '../dto/request/create-message-report.request';
import { CreateUserReportRequest } from '../dto/request/create-user-report.request';
import { ResolveReportRequest } from '../dto/request/resolve-report.request';

@Injectable()
export class ReportCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly messageReportRepository: MessageReportRepository,

    private readonly userReportRepository: UserReportRepository,

    private readonly messageQueryService: ChannelMessageQueryService,

    private readonly messageValidation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,

    private readonly permissionService: ServerPermissionService,

    private readonly auditRepository: ModerationAuditRepository,
  ) {}

  async submitMessageReport(
    serverId: string,
    userId: string,
    request: CreateMessageReportRequest,
  ) {
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const message = await this.messageQueryService.getMessage(
      request.messageId,
    );

    if (message.serverId !== serverId) {
      throw new NotFoundException('Message not found.');
    }

    if (message.isDeleted) {
      throw new BadRequestException('This message has been deleted.');
    }

    if (message.authorMemberId === member.id) {
      throw new BadRequestException('You cannot report your own message.');
    }

    await this.messageValidation.validateChannelViewPermission(
      message.channelId,
      userId,
    );

    const existing =
      await this.messageReportRepository.findByMessageAndReporter(
        message.id,
        member.id,
      );

    if (existing) {
      return serializeMessageReport(existing);
    }

    const report = await this.messageReportRepository.create({
      serverId,
      channelId: message.channelId,
      messageId: message.id,
      reporterMemberId: member.id,
      reason: request.reason,
      detailText: request.detailText,
    });

    return serializeMessageReport(report);
  }

  async submitUserReport(
    serverId: string,
    userId: string,
    request: CreateUserReportRequest,
  ) {
    const reporter = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    if (request.targetUserId === reporter.userId) {
      throw new BadRequestException('You cannot report yourself.');
    }

    await this.memberQueryService.getMember(serverId, request.targetUserId);

    const existing = await this.userReportRepository.findByReporterAndTarget(
      reporter.id,
      request.targetUserId,
    );

    if (existing) {
      return serializeUserReport(existing);
    }

    const report = await this.userReportRepository.create({
      serverId,
      reporterMemberId: reporter.id,
      targetUserId: request.targetUserId,
      reason: request.reason,
      detailText: request.detailText,
    });

    return serializeUserReport(report);
  }

  async resolveMessageReport(
    serverId: string,
    userId: string,
    reportId: string,
    request: ResolveReportRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.MANAGE_MESSAGES,
    );

    const actor = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const report = await this.messageReportRepository.findById(reportId);

    if (!report || report.serverId !== serverId) {
      throw new NotFoundException('Report not found.');
    }

    this.assertResolvable(report.status, request.status);

    const handledAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const resolved = await this.messageReportRepository.updateStatus(
          report.id,
          {
            status: request.status,
            handledByMemberId: actor.id,
            handledAt,
            detailText: request.note,
          },
          tx,
        );

        await this.auditRepository.create(
          {
            serverId,
            actorMemberId: actor.id,
            action: 'MESSAGE_REPORT_RESOLVED',
            reason: request.note ?? null,
            metadata: {
              messageId: report.messageId,
              channelId: report.channelId,
              reporterMemberId: report.reporterMemberId,
              reportedReason: report.reason,
              result: request.status,
            },
          },
          tx,
        );

        return resolved;
      },
    );

    return serializeMessageReport(updated);
  }

  async resolveUserReport(
    serverId: string,
    userId: string,
    reportId: string,
    request: ResolveReportRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.MEMBER_BAN,
    );

    const actor = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const report = await this.userReportRepository.findById(reportId);

    if (!report || report.serverId !== serverId) {
      throw new NotFoundException('Report not found.');
    }

    this.assertResolvable(report.status, request.status);

    const handledAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const resolved = await this.userReportRepository.updateStatus(
          report.id,
          {
            status: request.status,
            handledByMemberId: actor.id,
            handledAt,
            detailText: request.note,
          },
          tx,
        );

        await this.auditRepository.create(
          {
            serverId,
            actorMemberId: actor.id,
            action: 'USER_REPORT_RESOLVED',
            targetUserId: report.targetUserId,
            reason: request.note ?? null,
            metadata: {
              reporterMemberId: report.reporterMemberId,
              reportedReason: report.reason,
              result: request.status,
            },
          },
          tx,
        );

        return resolved;
      },
    );

    return serializeUserReport(updated);
  }

  private assertResolvable(current: ReportStatus, next: ReportStatus) {
    if (current !== ReportStatus.PENDING) {
      throw new BadRequestException('This report has already been handled.');
    }

    if (next === ReportStatus.PENDING) {
      throw new BadRequestException('An unhandled report cannot stay pending.');
    }
  }
}
