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

import { ChannelMessageCommandService } from '../services/channel-message-command.service';
import { ChannelMessageQueryService } from '../services/channel-message-query.service';

import { CreateChannelMessageRequest } from '../dto/request/create-channel-message.request';
import { UpdateChannelMessageRequest } from '../dto/request/update-channel-message.request';

@Controller()
export class ChannelMessageController {
  constructor(
    private readonly commandService: ChannelMessageCommandService,
    private readonly queryService: ChannelMessageQueryService,
  ) {}

  @Post('servers/:serverId/channels/:channelId/messages')
  async create(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateChannelMessageRequest,
  ) {
    return this.commandService.createMessage(
      serverId,
      channelId,
      userId,
      request.content,
    );
  }

  @Get('servers/:serverId/channels/:channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.queryService.getChannelMessages(
      channelId,
      Number(skip ?? 0),
      Number(take ?? 50),
    );
  }

  @Get('messages/:messageId')
  async getMessage(@Param('messageId') messageId: string) {
    return this.queryService.getMessage(messageId);
  }

  @Patch('servers/:serverId/messages/:messageId')
  async edit(
    @Param('messageId') messageId: string,
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateChannelMessageRequest,
  ) {
    return this.commandService.editMessage(
      messageId,
      serverId,
      userId,
      request.content,
    );
  }

  @Delete('messages/:messageId')
  async delete(
    @Param('messageId') messageId: string,
    @Query('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.deleteMessage(messageId, serverId, userId);
  }

  @Post('messages/:messageId/pin')
  async pin(
    @Param('messageId') messageId: string,
    @Query('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.pinMessage(messageId, serverId, userId);
  }

  @Delete('messages/:messageId/pin')
  async unpin(
    @Param('messageId') messageId: string,
    @Query('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.unpinMessage(messageId, serverId, userId);
  }
}
