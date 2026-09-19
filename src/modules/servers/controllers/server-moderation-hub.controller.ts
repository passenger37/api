import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { ServerModerationService } from '../services/server-moderation.service';
import { KickMemberRequest } from '../dto/request/kick-member.request';
import { BanMemberRequest } from '../dto/request/ban-member.request';
import { GetServerBansQuery } from '../dto/query/get-server-bans.query';

@Controller('servers/:serverId/moderation')
export class ServerModerationHubController {
  constructor(private readonly moderationService: ServerModerationService) {}

  /**
   * POST
   * /servers/:serverId/moderation/members/:memberId/kick
   */
  @Post('members/:memberId/kick')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async kickMember(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() request: KickMemberRequest,
  ) {
    return this.moderationService.kickMember(
      serverId,
      userId,
      memberId,
      request.reason,
    );
  }

  /**
   * POST
   * /servers/:serverId/moderation/members/:memberId/ban
   */
  @Post('members/:memberId/ban')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async banMember(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() request: BanMemberRequest,
  ) {
    return this.moderationService.banMember(
      serverId,
      userId,
      memberId,
      request.reason,
    );
  }

  /**
   * DELETE
   * /servers/:serverId/moderation/members/:memberId/ban
   */
  @Delete('members/:memberId/ban')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async unbanMember(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.moderationService.unbanMember(serverId, userId, memberId);
  }

  /**
   * GET
   * /servers/:serverId/moderation/members/bans
   */
  @Get('members/bans')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async listBans(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Query() request: GetServerBansQuery,
  ) {
    return this.moderationService.listBans(serverId, userId, {
      cursorId: request.cursor,
      limit: request.limit,
    });
  }
}
