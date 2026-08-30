import { Controller, Get, Param, Query } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { ServerAuditLogQueryService } from '../services/server-audit-log-query.service';
import { GetAuditLogQuery } from '../dto/query/get-audit-log.query';

@Controller('servers/:serverId/audit-logs')
export class ServerAuditLogController {
  constructor(
    private readonly auditLogQueryService: ServerAuditLogQueryService,
  ) {}

  /**
   * GET
   * /servers/:serverId/audit-logs
   */
  @Get()
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async getAuditLogs(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Query() request: GetAuditLogQuery,
  ) {
    return this.auditLogQueryService.getAuditLogs(serverId, userId, {
      action: request.action,
      cursorId: request.cursor,
      limit: request.limit,
    });
  }
}
