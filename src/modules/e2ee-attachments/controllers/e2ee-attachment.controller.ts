import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { E2eeAttachmentCommandService } from '../services/e2ee-attachment-command.service';
import { E2eeAttachmentQueryService } from '../services/e2ee-attachment-query.service';
import {
  CreateAttachmentRequest,
  UploadCompleteRequest,
  UploadFailedRequest,
  AddThumbnailRequest,
  LinkMessageRequest,
  GetAttachmentsRequest,
} from '../dto/attachment.request';

@ApiTags('E2EE Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee/attachments')
export class E2eeAttachmentController {
  constructor(
    private readonly commandService: E2eeAttachmentCommandService,
    private readonly queryService: E2eeAttachmentQueryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new E2EE attachment (get signed upload URL)',
  })
  async createAttachment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAttachmentRequest,
  ) {
    return this.commandService.createAttachment(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get attachments by session or group' })
  async getAttachments(
    @CurrentUser('id') userId: string,
    @Query() query: GetAttachmentsRequest,
  ) {
    if (query.sessionId) {
      return this.queryService.getAttachmentsBySession(userId, query);
    }
    if (query.groupId) {
      return this.queryService.getAttachmentsByGroup(userId, query);
    }
    throw new BadRequestException(
      'Either sessionId or groupId must be provided',
    );
  }

  @Get('device/:deviceId')
  @ApiOperation({ summary: 'Get attachments by sender device' })
  async getAttachmentsByDevice(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Query() query: GetAttachmentsRequest,
  ) {
    return this.queryService.getAttachmentsBySenderDevice(
      userId,
      deviceId,
      query,
    );
  }

  @Get(':attachmentId')
  @ApiOperation({ summary: 'Get an attachment by ID' })
  async getAttachment(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.queryService.getAttachmentById(attachmentId);
  }

  @Get(':attachmentId/url')
  @ApiOperation({ summary: 'Get a presigned download URL for an attachment' })
  async getAttachmentUrl(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.queryService.getAttachmentUrl(attachmentId, userId);
  }

  @Get('storage/:storageKey')
  @ApiOperation({ summary: 'Get an attachment by storage key' })
  async getAttachmentByStorageKey(
    @CurrentUser('id') userId: string,
    @Param('storageKey') storageKey: string,
  ) {
    return this.queryService.getAttachmentByStorageKey(storageKey);
  }

  @Post(':attachmentId/complete')
  @ApiOperation({ summary: 'Mark attachment upload as complete' })
  async completeUpload(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.commandService.completeUpload({ attachmentId });
  }

  @Post(':attachmentId/fail')
  @ApiOperation({ summary: 'Mark attachment upload as failed' })
  async failUpload(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
    @Body('error') error: string,
  ) {
    return this.commandService.failUpload({ attachmentId, error });
  }

  @Post(':attachmentId/thumbnail')
  @ApiOperation({ summary: 'Add encrypted thumbnail to attachment' })
  async addThumbnail(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: AddThumbnailRequest,
  ) {
    return this.commandService.addThumbnail({ ...dto, attachmentId });
  }

  @Post(':attachmentId/link-message')
  @ApiOperation({ summary: 'Link attachment to a message' })
  async linkMessage(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: LinkMessageRequest,
  ) {
    return this.commandService.linkMessage({ ...dto, attachmentId });
  }

  @Delete(':attachmentId')
  @ApiOperation({ summary: 'Delete an attachment' })
  async deleteAttachment(
    @CurrentUser('id') userId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.commandService.deleteAttachment(attachmentId, userId);
  }

  @Get('session/:sessionId/count')
  @ApiOperation({ summary: 'Count attachments in a session' })
  async countBySession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.queryService.countBySession(sessionId);
  }

  @Get('group/:groupId/count')
  @ApiOperation({ summary: 'Count attachments in a group' })
  async countByGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.queryService.countByGroup(groupId);
  }
}
