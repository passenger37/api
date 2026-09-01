import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeAttachmentRepository } from '../repositories/e2ee-attachment.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeGroupRepository } from '../../e2ee-groups/repositories/e2ee-group.repository';
import { GetAttachmentsRequest } from '../dto/attachment.request';
import { serializeAttachment, serializeAttachmentList } from '../serializers/e2ee-attachment.serializer';

@Injectable()
export class E2eeAttachmentQueryService {
  constructor(
    private readonly attachmentRepo: E2eeAttachmentRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly groupRepo: E2eeGroupRepository,
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