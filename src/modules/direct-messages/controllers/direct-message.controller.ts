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
import { DmCommandService } from '../services/dm-command.service';
import { DmQueryService } from '../services/dm-query.service';
import { E2eeDmCommandService } from '../services/e2ee-dm-command.service';
import { DmReactionQueryService } from '../services/dm-reaction-query.service';
import { DmReactionCommandService } from '../services/dm-reaction-command.service';
import { DmAttachmentService } from '../services/dm-attachment.service';
import { DmOpenRequest } from '../dto/request/dm-open.request';
import { DmReadRequest } from '../dto/request/dm-read.request';
import { DmEditRequest } from '../dto/request/dm-edit.request';
import { DmReactionRequest } from '../dto/request/dm-reaction.request';
import { DmChannelSettingsRequest } from '../dto/request/dm-channel-settings.request';
import { DmAttachmentUploadRequest } from '../dto/request/dm-attachment-upload.request';
import { DmE2eeSendRequest } from '../dto/request/dm-e2ee-send.request';
import { DmE2eeEditRequest } from '../dto/request/dm-e2ee-edit.request';
import { DmE2eeDeleteRequest } from '../dto/request/dm-e2ee-delete.request';
import { DmE2eeReactionRequest } from '../dto/request/dm-e2ee-reaction.request';
import { DmE2eeReadRequest } from '../dto/request/dm-e2ee-read.request';
import { DmE2eeTypingStartRequest } from '../dto/request/dm-e2ee-typing-start.request';
import { DmE2eeTypingStopRequest } from '../dto/request/dm-e2ee-typing-stop.request';
import { DmE2eeDisappearingSettingsRequest } from '../dto/request/dm-e2ee-disappearing.request';
import { DmE2eeSendAttachmentRequest } from '../dto/request/dm-e2ee-attachment.request';
import { DmMessagesQuery } from '../dto/query/dm-messages.query';
import { CreateDmReportRequest } from '../dto/request/create-dm-report.request';
import { ResolveDmReportRequest } from '../dto/request/resolve-dm-report.request';
import { ReportStatus } from '@prisma/client';
import { DmReportCommandService } from '../services/dm-report-command.service';

@Controller('dm')
export class DirectMessageController {
  constructor(
    private readonly commandService: DmCommandService,
    private readonly queryService: DmQueryService,
    private readonly e2eeCommandService: E2eeDmCommandService,
    private readonly reactionQueryService: DmReactionQueryService,
    private readonly reactionCommandService: DmReactionCommandService,
    private readonly attachmentService: DmAttachmentService,
    private readonly reportCommandService: DmReportCommandService,
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

  @Post('channels/:channelId/e2ee/messages')
  async sendE2eeMessage(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeSendRequest,
  ) {
    return this.e2eeCommandService.sendText(userId, {
      ...request,
      channelId,
    });
  }

  @Post('channels/:channelId/e2ee/messages/attachment')
  async sendE2eeAttachment(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeSendAttachmentRequest,
  ) {
    return this.e2eeCommandService.sendAttachment(userId, {
      ...request,
      channelId,
    });
  }

  @Patch('channels/:channelId/e2ee/messages/:messageId')
  async editE2eeMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeEditRequest,
  ) {
    return this.e2eeCommandService.editMessage(userId, {
      ...request,
      channelId,
      messageId,
    });
  }

  @Delete('channels/:channelId/e2ee/messages/:messageId')
  async deleteE2eeMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeDeleteRequest,
  ) {
    return this.e2eeCommandService.deleteMessage(userId, {
      ...request,
      channelId,
      messageId,
    });
  }

  @Post('channels/:channelId/e2ee/messages/:messageId/reactions')
  async addE2eeReaction(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeReactionRequest,
  ) {
    return this.e2eeCommandService.addReaction(userId, {
      ...request,
      channelId,
      messageId,
    });
  }

  @Delete('channels/:channelId/e2ee/messages/:messageId/reactions')
  async removeE2eeReaction(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeReactionRequest,
  ) {
    return this.e2eeCommandService.removeReaction(userId, {
      ...request,
      channelId,
      messageId,
    });
  }

  @Post('channels/:channelId/e2ee/messages/:messageId/read')
  async markE2eeRead(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeReadRequest,
  ) {
    return this.e2eeCommandService.markRead(userId, {
      ...request,
      channelId,
      messageId,
    });
  }

  @Post('channels/:channelId/e2ee/typing/start')
  async startE2eeTyping(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeTypingStartRequest,
  ) {
    return this.e2eeCommandService.startTyping(userId, {
      ...request,
      channelId,
    });
  }

  @Post('channels/:channelId/e2ee/typing/stop')
  async stopE2eeTyping(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeTypingStopRequest,
  ) {
    return this.e2eeCommandService.stopTyping(userId, {
      ...request,
      channelId,
    });
  }

  @Patch('channels/:channelId/e2ee/disappearing')
  async setE2eeDisappearingSettings(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeDisappearingSettingsRequest,
  ) {
    return this.e2eeCommandService.setDisappearingSettings(userId, {
      ...request,
      channelId,
    });
  }

  @Post('channels/:channelId/e2ee/messages/:messageId/attachment')
  async sendE2eeMessageWithAttachment(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmE2eeSendAttachmentRequest,
  ) {
    return this.e2eeCommandService.sendAttachment(userId, {
      ...request,
      channelId,
    });
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

  @Patch('channels/:channelId/settings')
  async updateSettings(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmChannelSettingsRequest,
  ) {
    return this.commandService.updateSettings(channelId, userId, request);
  }

  @Patch('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmEditRequest,
  ) {
    return this.commandService.edit(
      messageId,
      userId,
      request.content,
      request.expectedVersion,
    );
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandService.delete(messageId, userId);
  }

  @Get('messages/:messageId/reactions')
  async getReactions(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reactionQueryService.getReactions(messageId, userId);
  }

  @Post('messages/:messageId/reactions')
  async addReaction(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmReactionRequest,
  ) {
    return this.reactionCommandService.addReaction(
      messageId,
      userId,
      request.emoji,
    );
  }

  @Delete('messages/:messageId/reactions')
  async removeReaction(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmReactionRequest,
  ) {
    return this.reactionCommandService.removeReaction(
      messageId,
      userId,
      request.emoji,
    );
  }

  @Post('channels/:channelId/attachments/upload-request')
  async requestUpload(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: DmAttachmentUploadRequest,
  ) {
    return this.attachmentService.requestUpload(channelId, userId, request);
  }

  @Post('channels/:channelId/attachments/:attachmentId/confirm')
  async confirmUpload(
    @Param('channelId') channelId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attachmentService.confirmUpload(
      channelId,
      attachmentId,
      userId,
    );
  }

  @Get('channels/:channelId/attachments/:attachmentId/url')
  async getAttachmentUrl(
    @Param('channelId') channelId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('id') userId: string,
    @Query('disposition') disposition?: string,
  ) {
    return this.attachmentService.getDownloadUrl(
      channelId,
      attachmentId,
      userId,
      disposition === 'inline' ? 'inline' : 'attachment',
    );
  }

  @Post('channels/:channelId/messages/:messageId/report')
  async submitReport(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateDmReportRequest,
  ) {
    return this.reportCommandService.submit(
      {
        ...request,
        channelId,
        messageId,
      },
      userId,
    );
  }

  @Get('channels/:channelId/reports')
  async listReports(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('cursor') cursorId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.reportCommandService.listByChannel(channelId, status as ReportStatus | undefined, cursorId, parsedLimit);
  }

  @Patch('channels/:channelId/reports/:reportId/resolve')
  async resolveReport(
    @Param('channelId') channelId: string,
    @Param('reportId') reportId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ResolveDmReportRequest,
  ) {
    return this.reportCommandService.resolve(reportId, userId, request.status);
  }
}
