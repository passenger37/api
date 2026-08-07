import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';

import { ServerPermission } from '@prisma/client';

import { CreateServerChannelRequest } from '../dto/request/create-server-channel.request';
import { UpdateServerChannelRequest } from '../dto/request/update-server-channel.request';

import { ServerChannelCommandService } from '../services/server-channel-command.service';
import { ServerChannelQueryService } from '../services/server-channel-query.service';

@Controller('servers/:serverId/channels')
export class ServerChannelController {
  constructor(
    private readonly commandService: ServerChannelCommandService,
    private readonly queryService: ServerChannelQueryService,
  ) {}

  @Get()
  @RequireServerPermission(ServerPermission.CHANNEL_VIEW)
  async getChannels(@Param('serverId') serverId: string) {
    return this.queryService.getServerChannels(serverId);
  }

  @Get('search')
  @RequireServerPermission(ServerPermission.CHANNEL_VIEW)
  async searchChannels(
    @Param('serverId') serverId: string,

    @Query('q') keyword: string,
  ) {
    return this.queryService.searchChannels(serverId, keyword);
  }

  @Get(':channelId')
  @RequireServerPermission(ServerPermission.CHANNEL_VIEW)
  async getChannel(@Param('channelId') channelId: string) {
    return this.queryService.getChannel(channelId);
  }

  @Post()
  @RequireServerPermission(ServerPermission.CHANNEL_CREATE)
  async createChannel(
    @Param('serverId') serverId: string,

    @CurrentUser('id') userId: string,

    @Body()
    request: CreateServerChannelRequest,
  ) {
    return this.commandService.createChannel(serverId, userId, request);
  }

  @Patch(':channelId')
  @RequireServerPermission(ServerPermission.CHANNEL_UPDATE)
  async updateChannel(
    @Param('serverId') serverId: string,

    @Param('channelId') channelId: string,

    @CurrentUser('id') userId: string,

    @Body()
    request: UpdateServerChannelRequest,
  ) {
    return this.commandService.updateChannel(
      serverId,
      channelId,
      userId,
      request,
    );
  }

  @Delete(':channelId')
  @RequireServerPermission(ServerPermission.CHANNEL_DELETE)
  async deleteChannel(
    @Param('serverId') serverId: string,

    @Param('channelId') channelId: string,

    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.deleteChannel(serverId, channelId, userId);
  }
}
