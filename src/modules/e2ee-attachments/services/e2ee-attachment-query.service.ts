import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeAttachmentRepository } from '../repositories/e2ee-attachment.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeGroupRepository } from '../../e2ee-groups/repositories/e2ee-group.repository';
import { AttachmentStorageService } from '../../messages/services/attachment-storage.service';
import { GetAttachmentsRequest } from '../dto/attachment.request';
import { serializeAttachment, serializeAttachmentList } from '../serializers/e2ee-attachment.serializer';

@Injectable()
export class E2eeAttachmentQueryService {
  constructor(
    private readonly attachmentRepo: E2eeAttachmentRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly groupRepo: E2eeGroupRepository,
    private readonly storage: AttachmentStorageService,
    private readonly prisma: PrismaService,
  ) {}

  async getAttachmentsBySession(
    userId: string,
    dto: GetAttachmentsRequest,
  ) {
    if (!dto.sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.senderDeviceId !== userId &&
      session.recipientDeviceId !== userId
    ) {
      throw new NotFoundException('Session not found');
    }

    const attachments = await this.attachmentRepo.findBySession(dto.sessionId, {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
    });

    return {
      success: true,
      attachments: serializeAttachmentList(attachments),
    };
  }

  async getAttachmentsByGroup(
    userId: string,
    dto: GetAttachmentsRequest,
  ) {
    if (!dto.groupId) {
      throw new BadRequestException('groupId is required');
    }

    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const membership = await this.groupRepo.findMemberByUser(dto.groupId, userId);
    if (!membership) {
      throw new NotFoundException('Group not found');
    }

    const attachments = await this.attachmentRepo.findByGroup(dto.groupId, {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
    });

    return {
      success: true,
      attachments: serializeAttachmentList(attachments),
    };
  }

  async getAttachmentsBySenderDevice(
    userId: string,
    senderDeviceId: string,
    dto: GetAttachmentsRequest,
  ) {
    const device = await this.prisma.e2eeDevice.findUnique({
      where: { id: senderDeviceId },
    });
    if (!device || device.userId !== userId) {
      throw new NotFoundException('Device not found');
    }

    const attachments = await this.attachmentRepo.findBySenderDevice(
      senderDeviceId,
      {
        limit: dto.limit ?? 20,
        cursor: dto.cursor,
      },
    );

    return {
      success: true,
      attachments: serializeAttachmentList(attachments),
    };
  }

  async getAttachmentById(attachmentId: string) {
    const attachment = await this.attachmentRepo.findById(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return { success: true, attachment: serializeAttachment(attachment) };
  }

  /**
   * Returns a presigned (or public) download URL for an e2ee attachment.
   * Authorized for the sender device owner, either party of the linked
   * session, or any active member of the linked group.
   */
  async getAttachmentUrl(attachmentId: string, userId: string) {
    const attachment = await this.attachmentRepo.findById(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    let authorized = false;
    const senderDevice = await this.prisma.e2eeDevice.findUnique({
      where: { id: attachment.senderDeviceId },
    });
    if (senderDevice?.userId === userId) authorized = true;

    if (!authorized && attachment.sessionId) {
      const session = await this.sessionRepo.findById(attachment.sessionId);
      if (session) {
        for (const deviceId of [session.senderDeviceId, session.recipientDeviceId]) {
          const device = await this.prisma.e2eeDevice.findUnique({
            where: { id: deviceId },
          });
          if (device?.userId === userId) {
            authorized = true;
            break;
          }
        }
      }
    }

    if (!authorized && attachment.groupId) {
      const member = await this.groupRepo.findMemberByUser(attachment.groupId, userId);
      if (member) authorized = true;
    }

    if (!authorized) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.status !== 'UPLOADED') {
      throw new BadRequestException('Attachment is not ready yet.');
    }

    const publicUrl = this.storage.publicUrl(attachment.storageKey);
    const url =
      publicUrl ??
      (await this.storage.createPresignedGetUrl(
        attachment.storageKey,
        attachment.mimeType ?? 'application/octet-stream',
        attachment.fileName ?? 'attachment',
      ));

    return {
      success: true,
      attachmentId: attachment.id,
      url,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  async getAttachmentByStorageKey(storageKey: string) {
    const attachment = await this.attachmentRepo.findByStorageKey(storageKey);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return { success: true, attachment: serializeAttachment(attachment) };
  }

  async countBySession(sessionId: string) {
    const count = await this.attachmentRepo.countBySession(sessionId);
    return { success: true, count };
  }

  async countByGroup(groupId: string) {
    const count = await this.attachmentRepo.countByGroup(groupId);
    return { success: true, count };
  }
}