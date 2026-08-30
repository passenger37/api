import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MessageAttachmentService } from '../services/message-attachment.service';
import { RequestAttachmentUploadRequest } from '../dto/request/request-attachment-upload.request';
import { GetAttachmentUrlQuery } from '../dto/query/get-attachment-url.query';

@Controller()
export class MessageAttachmentController {
  constructor(private readonly attachmentService: MessageAttachmentService) {}

  @Post(
    'servers/:serverId/channels/:channelId/messages/attachments/upload-request',
  )
  async requestUpload(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Body() request: RequestAttachmentUploadRequest,
  ) {
    return this.attachmentService.requestUpload(
      serverId,
      channelId,
      userId,
      request,
    );
  }

  @Post(
    'servers/:serverId/channels/:channelId/messages/attachments/:attachmentId/confirm',
  )
  async confirmUpload(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attachmentService.confirmUpload(
      serverId,
      channelId,
      attachmentId,
      userId,
    );
  }

  @Get(
    'servers/:serverId/channels/:channelId/messages/attachments/:attachmentId/url',
  )
  async getAttachmentUrl(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('id') userId: string,
    @Query() query: GetAttachmentUrlQuery,
  ) {
    return this.attachmentService.getDownloadUrl(
      serverId,
      channelId,
      attachmentId,
      userId,
      query.disposition,
    );
  }
}
