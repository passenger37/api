import {
  BadRequestException,
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
import { ChannelMessageValidationService } from '../services/channel-message-validation.service';
import { ChannelMessageCommandService } from '../services/channel-message-command.service';
import { ChannelMessageQueryService } from '../services/channel-message-query.service';

import { CreateChannelMessageRequest } from '../dto/request/create-channel-message.request';
import { UpdateChannelMessageRequest } from '../dto/request/update-channel-message.request';
import { GetChannelMessagesQuery } from '../dto/query/get-channel-messages.query';
import { GetRepliesQuery } from '../dto/query/get-replies.query';
import { GetEditHistoryQuery } from '../dto/query/get-edit-history.query';

@Controller()
export class ChannelMessageController {
  constructor(
    private readonly commandService: ChannelMessageCommandService,
    private readonly queryService: ChannelMessageQueryService,
    private readonly validation: ChannelMessageValidationService,
  ) {}

  @Post('servers/:serverId/channels/:channelId/messages')
  async create(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateChannelMessageRequest,
  ) {
    return this.commandService.createMessage(
      channelId,
      userId,
      request.content,
      request.parentMessageId,
    );
  }

  @Get('servers/:serverId/channels/:channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Query() query: GetChannelMessagesQuery,
  ) {
    await this.validation.validateChannelAccess(channelId, userId);

    const limit = query.limit ?? 50;
    if (limit <= 0 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.queryService.getChannelMessagesPaginated(
      channelId,
      query.cursor,
      limit,
    );
  }

  @Get('messages/:messageId')
  async getMessage(@Param('messageId') messageId: string) {
    return this.queryService.getMessage(messageId);
  }

  @Get('servers/:serverId/channels/:channelId/messages/:messageId/replies')
  async getReplies(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Query() query: GetRepliesQuery,
  ) {
    await this.validation.validateChannelAccess(channelId, userId);

    const limit = query.limit ?? 50;
    if (limit <= 0 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.queryService.getThread(messageId, query.cursor, limit);
  }

  @Get('servers/:serverId/channels/:channelId/messages/:messageId/history')
  async getEditHistory(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Query() query: GetEditHistoryQuery,
  ) {
    await this.validation.validateChannelAccess(channelId, userId);

    const limit = query.limit ?? 50;
    if (limit <= 0 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.queryService.getEditHistory(messageId, query.cursor, limit);
  }

  @Patch('servers/:serverId/messages/:messageId')
  async edit(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateChannelMessageRequest,
  ) {
    return this.commandService.editMessage(messageId, userId, request.content);
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

  @Delete('messages/:messageId/unpin')
  async unpin(
    @Param('messageId') messageId: string,
    @Query('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.unpinMessage(messageId, serverId, userId);
  }
}
