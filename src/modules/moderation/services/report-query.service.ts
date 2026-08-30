import { ForbiddenException, Injectable } from '@nestjs/common';

import { ReportStatus, ServerPermission } from '@prisma/client';

import { ServerPermissionService } from '../../servers/services/server-permission.service';

import { MessageReportRepository } from '../repositories/message-report.repository';
import { UserReportRepository } from '../repositories/user-report.repository';

import {
  serializeMessageReport,
  serializeUserReport,
} from '../serializers/report.serializer';

@Injectable()
export class ReportQueryService {
  constructor(
    private readonly messageReportRepository: MessageReportRepository,

    private readonly userReportRepository: UserReportRepository,

    private readonly permissionService: ServerPermissionService,
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
      items: reports.map((report) => serializeMessageReport(report)),
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
      items: reports.map((report) => serializeUserReport(report)),
    };
  }
}
