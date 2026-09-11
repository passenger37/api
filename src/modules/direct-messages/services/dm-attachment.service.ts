import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AttachmentStorageService } from '../../messages/services/attachment-storage.service';
import { AttachmentValidationService } from '../../messages/services/attachment-validation.service';
import { MessageSpamControlService } from '../../messages/services/message-spam-control.service';
import { DirectMessageAttachmentRepository } from '../repositories/direct-message-attachment.repository';
import { DmQueryService } from './dm-query.service';

@Injectable()
export class DmAttachmentService {
  constructor(
    private readonly queryService: DmQueryService,
    private readonly storage: AttachmentStorageService,
    private readonly attachmentValidation: AttachmentValidationService,
    private readonly repository: DirectMessageAttachmentRepository,
    private readonly spamControl: MessageSpamControlService,
  ) {}

  async requestUpload(
    channelId: string,
    userId: string,
    dto: { fileName: string; mimeType: string; sizeBytes: number },
  ) {
    const channel = await this.queryService.getChannel(channelId, userId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    await this.spamControl.checkUploadRequest(userId);

    const fileName = this.attachmentValidation.validateUploadPolicy(
      dto.fileName,
      dto.mimeType,
      dto.sizeBytes,
    );

    const pending = await this.repository.countPending(channelId, userId);

    if (
      pending >= AttachmentValidationService.MAX_PENDING_ATTACHMENTS_PER_CHANNEL
    ) {
      throw new BadRequestException(
        'Too many pending uploads. Confirm or cancel uploads first.',
      );
    }

    const id = randomUUID();

    const storageKey = `dm-attachments/${channelId}/${id}_${fileName}`.replace(
      /[^a-zA-Z0-9/._-]/g,
      '_',
    );

    const uploadUrl = await this.storage.createPresignedPutUrl(
      storageKey,
      dto.mimeType,
    );

    const attachment = await this.repository.create({
      id,
      channelId,
      uploadedById: userId,
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

  async confirmUpload(channelId: string, attachmentId: string, userId: string) {
    await this.queryService.getChannel(channelId, userId);

    const attachment = await this.repository.findById(attachmentId);

    if (!attachment || attachment.channelId !== channelId) {
      throw new NotFoundException('Attachment not found.');
    }

    if (attachment.uploadedById !== userId) {
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
    channelId: string,
    attachmentId: string,
    userId: string,
    disposition: 'inline' | 'attachment' = 'attachment',
  ) {
    await this.queryService.getChannel(channelId, userId);

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
    uploaderUserId: string,
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
      uploaderUserId,
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
