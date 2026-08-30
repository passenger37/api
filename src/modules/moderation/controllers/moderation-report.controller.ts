import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { RequireServerPermission } from '../../servers/decorators/require-server-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { ReportQueryService } from '../services/report-query.service';
import { ReportCommandService } from '../services/report-command.service';
import { CreateMessageReportRequest } from '../dto/request/create-message-report.request';
import { CreateUserReportRequest } from '../dto/request/create-user-report.request';
import { ResolveReportRequest } from '../dto/request/resolve-report.request';
import { GetReportsQuery } from '../dto/query/get-reports.query';

@Controller('servers/:serverId/reports')
export class ModerationReportController {
  constructor(
    private readonly queryService: ReportQueryService,
    private readonly commandService: ReportCommandService,
  ) {}

  /**
   * POST
   * /servers/:serverId/reports/messages
   */
  @Post('messages')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async reportMessage(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateMessageReportRequest,
  ) {
    return this.commandService.submitMessageReport(serverId, userId, request);
  }

  /**
   * GET
   * /servers/:serverId/reports/messages
   */
  @Get('messages')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async listMessageReports(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Query() request: GetReportsQuery,
  ) {
    return this.queryService.listMessageReports(serverId, userId, {
      status: request.status,
      cursorId: request.cursor,
      limit: request.limit,
    });
  }

  /**
   * PATCH
   * /servers/:serverId/reports/messages/:reportId/resolve
   */
  @Patch('messages/:reportId/resolve')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async resolveMessageReport(
    @Param('serverId') serverId: string,
    @Param('reportId') reportId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ResolveReportRequest,
  ) {
    return this.commandService.resolveMessageReport(
      serverId,
      userId,
      reportId,
      request,
    );
  }

  /**
   * POST
   * /servers/:serverId/reports/users
   */
  @Post('users')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async reportUser(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateUserReportRequest,
  ) {
    return this.commandService.submitUserReport(serverId, userId, request);
  }

  /**
   * GET
   * /servers/:serverId/reports/users
   */
  @Get('users')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async listUserReports(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Query() request: GetReportsQuery,
  ) {
    return this.queryService.listUserReports(serverId, userId, {
      status: request.status,
      cursorId: request.cursor,
      limit: request.limit,
    });
  }

  /**
   * PATCH
   * /servers/:serverId/reports/users/:reportId/resolve
   */
  @Patch('users/:reportId/resolve')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async resolveUserReport(
    @Param('serverId') serverId: string,
    @Param('reportId') reportId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ResolveReportRequest,
  ) {
    return this.commandService.resolveUserReport(
      serverId,
      userId,
      reportId,
      request,
    );
  }
}
