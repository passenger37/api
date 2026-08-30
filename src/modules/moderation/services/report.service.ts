import {
  BadRequestException,
  ForbiddenException,
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

import { CreateMessageReportRequest } from '../dto/request/create-message-report.request';
import { CreateUserReportRequest } from '../dto/request/create-user-report.request';
import { ResolveReportRequest } from '../dto/request/resolve-report.request';

@Injectable()
export class ReportService {
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

  /**
   * Reports must be reviewed by either message-managers (moderators) or
   * audit-log viewers (admins/owner).
   */
  private async requireReportQueueAccess(serverId: string, userId: string) {
    const [canManage, canAudit] = await Promise.all([
      this.permissionService.hasPermission(
        serverId,
        userId,
        ServerPermission.MANAGE_MESSAGES,
      ),
      this.permissionService.hasPermission(
        serverId,
        userId,
        ServerPermission.AUDIT_LOG_VIEW,
      ),
    ]);

    if (!canManage && !canAudit) {
      throw new ForbiddenException(
        'You do not have permission to view the report queue.',
      );
    }
  }

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
      return this.serializeMessageReport(existing);
    }

    const report = await this.messageReportRepository.create({
      serverId,
      channelId: message.channelId,
      messageId: message.id,
      reporterMemberId: member.id,
      reason: request.reason,
      detailText: request.detailText,
    });

    return this.serializeMessageReport(report);
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
      return this.serializeUserReport(existing);
    }

    const report = await this.userReportRepository.create({
      serverId,
      reporterMemberId: reporter.id,
      targetUserId: request.targetUserId,
      reason: request.reason,
      detailText: request.detailText,
    });

    return this.serializeUserReport(report);
  }

  async listMessageReports(
    serverId: string,
    userId: string,
    options: {
      status?: ReportStatus;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    await this.requireReportQueueAccess(serverId, userId);

    const reports = await this.messageReportRepository.listByServer(serverId, {
      status: options.status ?? ReportStatus.PENDING,
      cursorId: options.cursorId,
      limit: options.limit,
    });

    return {
      items: reports.map((report) => this.serializeMessageReport(report)),
    };
  }

  async listUserReports(
    serverId: string,
    userId: string,
    options: {
      status?: ReportStatus;
      cursorId?: string;
      limit?: number;
    } = {},
  ) {
    await this.requireReportQueueAccess(serverId, userId);

    const reports = await this.userReportRepository.listByServer(serverId, {
      status: options.status ?? ReportStatus.PENDING,
      cursorId: options.cursorId,
      limit: options.limit,
    });

    return {
      items: reports.map((report) => this.serializeUserReport(report)),
    };
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

    return this.serializeMessageReport(updated);
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

    return this.serializeUserReport(updated);
  }

  private assertResolvable(current: ReportStatus, next: ReportStatus) {
    if (current !== ReportStatus.PENDING) {
      throw new BadRequestException('This report has already been handled.');
    }

    if (next === ReportStatus.PENDING) {
      throw new BadRequestException('An unhandled report cannot stay pending.');
    }
  }

  private serializeMessageReport(report: {
    id: string;
    serverId: string;
    channelId: string;
    messageId: string;
    reporterMemberId: string;
    reason: string;
    detailText: string | null;
    status: string;
    handledByMemberId: string | null;
    handledAt: Date | null;
    createdAt: Date;
    message?: {
      id: string;
      content?: string;
      authorMemberId?: string;
      createdAt?: Date;
    } | null;
    reporter?: {
      user?: { id: string; username: string; displayName: string } | null;
    } | null;
    handledBy?: {
      user?: { id: string; username: string; displayName: string } | null;
    } | null;
  }) {
    return {
      id: report.id,
      serverId: report.serverId,
      channelId: report.channelId,
      messageId: report.messageId,
      reporterMemberId: report.reporterMemberId,
      reason: report.reason,
      detailText: report.detailText,
      status: report.status,
      handledByMemberId: report.handledByMemberId,
      handledAt: report.handledAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      message: report.message
        ? {
            id: report.message.id,
            content: report.message.content,
            authorMemberId: report.message.authorMemberId,
            createdAt: report.message.createdAt?.toISOString() ?? null,
          }
        : undefined,
      reporterUser: report.reporter?.user
        ? {
            id: report.reporter.user.id,
            username: report.reporter.user.username,
            displayName: report.reporter.user.displayName,
          }
        : undefined,
    };
  }

  private serializeUserReport(report: {
    id: string;
    serverId: string;
    reporterMemberId: string;
    targetUserId: string;
    reason: string;
    detailText: string | null;
    status: string;
    handledByMemberId: string | null;
    handledAt: Date | null;
    createdAt: Date;
    target?: {
      id: string;
      username?: string;
      displayName?: string;
      avatarUrl?: string | null;
    } | null;
    reporter?: {
      user?: { id: string; username: string; displayName: string } | null;
    } | null;
    handledBy?: {
      user?: { id: string; username: string; displayName: string } | null;
    } | null;
  }) {
    return {
      id: report.id,
      serverId: report.serverId,
      reporterMemberId: report.reporterMemberId,
      targetUserId: report.targetUserId,
      reason: report.reason,
      detailText: report.detailText,
      status: report.status,
      handledByMemberId: report.handledByMemberId,
      handledAt: report.handledAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      targetUser: report.target
        ? {
            id: report.target.id,
            username: report.target.username,
            displayName: report.target.displayName,
            avatarUrl: report.target.avatarUrl,
          }
        : undefined,
      reporterUser: report.reporter?.user
        ? {
            id: report.reporter.user.id,
            username: report.reporter.user.username,
            displayName: report.reporter.user.displayName,
          }
        : undefined,
    };
  }
}
