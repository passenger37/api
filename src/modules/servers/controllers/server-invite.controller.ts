import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUserDto } from '../../auth/dto/current-user.dto';

import { ServerInviteCommandService } from '../invites/services/server-invite-command.service';

import { CreateServerInviteRequest } from '../dto/request/create-server-invite.request';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';
import { ServerPermissionGuard } from '../gaurds/server-permission.guard';

import { ServerPermission } from '@prisma/client';

@Controller('servers/:serverId/invites')
@UseGuards(JwtAuthGuard, ServerPermissionGuard)
export class ServerInviteController {
  constructor(private readonly commandService: ServerInviteCommandService) {}

  @Post()
  @RequireServerPermission(ServerPermission.INVITE_CREATE)
  async createInvite(
    @Param('serverId') serverId: string,

    @CurrentUser()
    user: CurrentUserDto,

    @Body()
    request: CreateServerInviteRequest,
  ) {
    return this.commandService.createInvite(serverId, user.id, request);
  }
}
