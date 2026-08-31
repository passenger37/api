import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DmCommandService } from '../services/dm-command.service';
import { DmQueryService } from '../services/dm-query.service';
import { DmOpenRequest } from '../dto/request/dm-open.request';
import { DmReadRequest } from '../dto/request/dm-read.request';
import { DmMessagesQuery } from '../dto/query/dm-messages.query';

@Controller('dm')
export class DirectMessageController {
  constructor(
    private readonly commandService: DmCommandService,
    private readonly queryService: DmQueryService,
  ) {}

  @Post('channels')
  async open(
    @CurrentUser('id') userId: string,
    @Body() request: DmOpenRequest,
  ) {
    const channel = await this.commandService.open(
      userId,
      request.targetUserId,
    );

    return this.queryService.getChannel(channel.id, userId);
  }

  @Get('channels')
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: DmMessagesQuery,
  ) {
    return this.queryService.listChannels(
      userId,
      query.cursor,
      query.limit ?? 50,
    );
  }

  @Get('channels/:channelId')
  async getChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queryService.getChannel(channelId, userId);
  }

  @Get('channels/:channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Query() query: DmMessagesQuery,
  ) {
    return this.queryService.getHistory(
      channelId,
      userId,
      query.cursor,
      query.limit ?? 50,
    );
  }

  @Patch('channels/:channelId/read')
  async markRead(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmReadRequest,
  ) {
    return this.commandService.markRead(
      channelId,
      userId,
      request.lastReadMessageId,
    );
  }
}
