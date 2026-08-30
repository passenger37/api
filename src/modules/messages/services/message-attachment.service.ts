import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentValidationService } from './attachment-validation.service';
import { MessageAttachmentRepository } from '../repositories/message-attachment.repository';

@Injectable()
export class MessageAttachmentService {
  constructor(
    private readonly validation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,

    private readonly storage: AttachmentStorageService,

    private readonly attachmentValidation: AttachmentValidationService,

    private readonly repository: MessageAttachmentRepository,
  ) {}

  async requestUpload(
    serverId: string,
    channelId: string,
    userId: string,
    dto: { fileName: string; mimeType: string; sizeBytes: number },
  ) {
    const channel = await this.validation.validateSendPermission(
      channelId,
      userId,
    );

    if (channel.serverId !== serverId) {
      throw new BadRequestException('Channel does not belong to this server.');
    }

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const fileName = this.attachmentValidation.validateUploadPolicy(
      dto.fileName,
      dto.mimeType,
      dto.sizeBytes,
    );

    const pending = await this.repository.countPending(channelId, member.id);

    if (
      pending >= AttachmentValidationService.MAX_PENDING_ATTACHMENTS_PER_CHANNEL
    ) {
      throw new BadRequestException(
        'Too many pending uploads. Confirm or cancel uploads first.',
      );
    }

    const id = randomUUID();

    const storageKey =
      `attachments/${serverId}/${channelId}/${id}_${fileName}`.replace(
        /[^\w/._\-\u0000-\u007f]/g,
        '_',
      );

    const uploadUrl = await this.storage.createPresignedPutUrl(
      storageKey,
      dto.mimeType,
    );

    const attachment = await this.repository.create({
      id,
      serverId,
      channelId,
      uploadedById: member.id,
      fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storageKey,
      status: 'PENDING',
    });

    return {
      attachmentId: attachment.id,
      uploadUrl,
      objectKey: storageKey,
      fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    };
  }

  async confirmUpload(
    serverId: string,
    channelId: string,
    attachmentId: string,
    userId: string,
  ) {
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const attachment = await this.repository.findById(attachmentId);

    if (
      !attachment ||
      attachment.serverId !== serverId ||
      attachment.channelId !== channelId
    ) {
      throw new NotFoundException('Attachment not found.');
    }

    if (attachment.uploadedById !== member.id) {
      throw new BadRequestException(
        'Only the uploader can confirm this attachment.',
      );
    }

    if (attachment.status === 'UPLOADED') {
      return {
        attachmentId: attachment.id,
        status: attachment.status,
      };
    }

    const sizeBytes = await this.storage.objectSize(attachment.storageKey);

    if (sizeBytes === null) {
      throw new BadRequestException(
        'Uploaded object not found. Request a fresh upload URL and retry.',
      );
    }

    if (sizeBytes !== attachment.sizeBytes) {
      throw new BadRequestException(
        'Uploaded size does not match the declared size.',
      );
    }

    const confirmed = await this.repository.markUploaded(
      attachmentId,
      sizeBytes,
    );

    return {
      attachmentId: confirmed.id,
      status: confirmed.status,
    };
  }

  async getDownloadUrl(
    serverId: string,
    channelId: string,
    attachmentId: string,
    userId: string,
    disposition: 'inline' | 'attachment' = 'attachment',
  ) {
    await this.validation.validateChannelAccess(channelId, userId);

    const attachment = await this.repository.findById(attachmentId);

    if (!attachment || attachment.channelId !== channelId) {
      throw new NotFoundException('Attachment not found.');
    }

    if (attachment.status !== 'UPLOADED') {
      throw new BadRequestException('Attachment is not ready yet.');
    }

    const publicUrl = this.storage.publicUrl(attachment.storageKey);

    const url =
      publicUrl ??
      (await this.storage.createPresignedGetUrl(
        attachment.storageKey,
        attachment.mimeType,
        attachment.fileName,
        disposition,
      ));

    return {
      attachmentId: attachment.id,
      url,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      disposition,
    };
  }

  async attachToMessage(
    messageId: string,
    channelId: string,
    uploaderMemberId: string,
    attachmentIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (!Array.isArray(attachmentIds)) {
      throw new BadRequestException('attachmentIds must be an array.');
    }

    if (!attachmentIds.length) {
      return;
    }

    const result = await this.repository.attachToMessage(
      messageId,
      channelId,
      uploaderMemberId,
      attachmentIds,
      tx,
    );

    if (result.count !== attachmentIds.length) {
      throw new BadRequestException(
        'One or more attachments are not available for this message.',
      );
    }
  }
}
