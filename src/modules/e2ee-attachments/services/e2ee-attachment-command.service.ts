import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeAttachmentRepository } from '../repositories/e2ee-attachment.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeGroupRepository } from '../../e2ee-groups/repositories/e2ee-group.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { CreateAttachmentRequest, UploadCompleteRequest, UploadFailedRequest, AddThumbnailRequest, LinkMessageRequest } from '../dto/attachment.request';
import { serializeAttachment } from '../serializers/e2ee-attachment.serializer';

@Injectable()
export class E2eeAttachmentCommandService {
  constructor(
    private readonly attachmentRepo: E2eeAttachmentRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly groupRepo: E2eeGroupRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createAttachment(userId: string, dto: CreateAttachmentRequest) {
    const senderDevice = await this.deviceRepo.findActiveById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new NotFoundException('Sender device not found or not owned by user');
    }

    // Validate session or group
    if (dto.sessionId) {
      const session = await this.sessionRepo.findById(dto.sessionId);
      if (!session || !session.isActive) {
        throw new BadRequestException('Session not found or not active');
      }
      if (
        session.senderDeviceId !== dto.senderDeviceId &&
        session.recipientDeviceId !== dto.senderDeviceId
      ) {
        throw new ForbiddenException('Session does not involve sender device');
      }
    }

    if (dto.groupId) {
      const group = await this.groupRepo.findById(dto.groupId);
      if (!group || !group.isActive) {
        throw new BadRequestException('Group not found or not active');
      }

      const member = await this.groupRepo.findMember(dto.groupId, dto.senderDeviceId);
      if (!member || !member.isActive) {
        throw new ForbiddenException('Sender is not a member of this group');
      }
    }

    if (!dto.sessionId && !dto.groupId) {
      throw new BadRequestException('Either sessionId or groupId must be provided');
    }

    if (dto.sessionId && dto.groupId) {
      throw new BadRequestException('Cannot provide both sessionId and groupId');
    }

    // Generate storage key
    const storageKey = `e2ee/attachments/${dto.senderDeviceId}/${Date.now()}-${dto.fileName}`;

    const attachment = await this.attachmentRepo.create({
      session: dto.sessionId ? { connect: { id: dto.sessionId } } : undefined,
      group: dto.groupId ? { connect: { id: dto.groupId } } : undefined,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storageKey,
      encryptedFileKey: dto.encryptedFileKey,
      encryptedThumbnailKey: dto.encryptedThumbnailKey,
      fileHash: dto.fileHash,
      thumbnailHash: dto.thumbnailHash,
      messageId: dto.messageId,
      senderDevice: { connect: { id: dto.senderDeviceId } },
    });

    // Generate signed upload URL (in production, this would call R2/MinIO)
    const uploadUrl = this.generateUploadUrl(storageKey);

    return {
      success: true,
      attachment: serializeAttachment(attachment),
      uploadUrl,
    };
  }

  async completeUpload(dto: UploadCompleteRequest) {
    const attachment = await this.attachmentRepo.findById(dto.attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.status !== 'PENDING') {
      throw new BadRequestException('Attachment is not in pending state');
    }

    const updated = await this.attachmentRepo.updateStatus(dto.attachmentId, 'UPLOADED');
    return { success: true, attachment: serializeAttachment(updated) };
  }

  async failUpload(dto: UploadFailedRequest) {
    const attachment = await this.attachmentRepo.findById(dto.attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const updated = await this.attachmentRepo.updateStatus(dto.attachmentId, 'FAILED', dto.error);
    return { success: true, attachment: serializeAttachment(updated) };
  }

  async addThumbnail(dto: AddThumbnailRequest) {
    const attachment = await this.attachmentRepo.findById(dto.attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.status !== 'UPLOADED') {
      throw new BadRequestException('Attachment must be uploaded before adding thumbnail');
    }

    const updated = await this.attachmentRepo.updateThumbnail(dto.attachmentId, {
      thumbnailStorageKey: dto.thumbnailStorageKey,
      thumbnailMimeType: dto.thumbnailMimeType,
      thumbnailSizeBytes: dto.thumbnailSizeBytes,
      encryptedThumbnailKey: dto.encryptedThumbnailKey,
      thumbnailHash: dto.thumbnailHash,
    });

    return { success: true, attachment: serializeAttachment(updated) };
  }

  async linkMessage(dto: LinkMessageRequest) {
    const attachment = await this.attachmentRepo.findById(dto.attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.messageId) {
      throw new BadRequestException('Attachment already linked to a message');
    }

    const updated = await this.attachmentRepo.linkMessage(dto.attachmentId, dto.messageId);
    return { success: true, attachment: serializeAttachment(updated) };
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.attachmentRepo.findById(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const senderDevice = await this.deviceRepo.findActiveById(attachment.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this attachment');
    }

    await this.attachmentRepo.updateStatus(attachmentId, 'DELETED');
    return { success: true, deleted: true };
  }

  private generateUploadUrl(storageKey: string): string {
    // In production, this would generate a signed URL for Cloudflare R2 / MinIO
    // For now, return a placeholder
    return `https://storage.example.com/${storageKey}?signature=placeholder`;
  }
}