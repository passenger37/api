import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';

import { UpsertChannelPermissionOverwriteRequest } from '../dto/request/upsert-channel-permission-overwrite.request';

import { ServerChannelPermissionOverwriteCommandService } from '../services/server-channel-permission-overwrite-command.service';
import { ServerChannelPermissionOverwriteQueryService } from '../services/server-channel-permission-overwrite-query.service';

@Controller('servers/:serverId/channels/:channelId/permission-overwrites')
export class ServerChannelPermissionOverwriteController {
  constructor(
    private readonly commandService: ServerChannelPermissionOverwriteCommandService,
    private readonly queryService: ServerChannelPermissionOverwriteQueryService,
  ) {}

  @Get()
  @RequireServerPermission(ServerPermission.CHANNEL_VIEW)
  async getChannelOverwrites(@Param('channelId') channelId: string) {
    return this.queryService.getChannelOverwrites(channelId);
  }

  @Get(':overwriteId')
  @RequireServerPermission(ServerPermission.CHANNEL_VIEW)
  async getOverwrite(@Param('overwriteId') overwriteId: string) {
    return this.queryService.getOverwrite(overwriteId);
  }

  @Post()
  @RequireServerPermission(ServerPermission.CHANNEL_UPDATE)
  async upsertOverwrite(
    @Param('channelId') channelId: string,

    @Body()
    request: UpsertChannelPermissionOverwriteRequest,
  ) {
    return this.commandService.upsertOverwrite(channelId, request);
  }

  @Delete(':overwriteId')
  @RequireServerPermission(ServerPermission.CHANNEL_UPDATE)
  async deleteOverwrite(@Param('overwriteId') overwriteId: string) {
    return this.commandService.deleteOverwrite(overwriteId);
  }
}
