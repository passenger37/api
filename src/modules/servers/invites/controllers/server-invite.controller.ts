import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';

import { CreateServerInviteRequest } from '../dto/request/create-server-invite.request';
import { CreateServerInviteResponse } from '../dto/reponse/create-server-invite.response';

import { ServerInviteCommandService } from '../services/server-invite-command.service';
import { ServerInviteQueryService } from '../services/server-invite-query.service';

@Controller()
export class ServerInviteController {
  constructor(
    private readonly commandService: ServerInviteCommandService,
    private readonly queryService: ServerInviteQueryService,
  ) {}

  @Post('servers/:serverId/invites')
  async createInvite(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateServerInviteRequest,
  ): Promise<CreateServerInviteResponse> {
    return this.commandService.createInvite(serverId, userId, request);
  }

  @Get('servers/:serverId/invites')
  async getServerInvites(@Param('serverId') serverId: string) {
    return this.queryService.getServerInvites(serverId);
  }

  @Get('invites/:code')
  async resolveInvite(@Param('code') code: string) {
    return this.queryService.resolveInvite(code);
  }

  @Patch('invites/:inviteId/revoke')
  async revokeInvite(
    @Param('inviteId') inviteId: string,
    @Body('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.commandService.revokeInvite(serverId, userId, inviteId);

    return {
      success: true,
    };
  }

  @Delete('invites/:inviteId')
  async deleteInvite(
    @Param('inviteId') inviteId: string,
    @Body('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.commandService.deleteInvite(serverId, userId, inviteId);

    return {
      success: true,
    };
  }
}
