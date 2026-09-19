import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeAttachment, Prisma } from '@prisma/client';

@Injectable()
export class E2eeAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeAttachmentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeAttachment> {
    const client = tx ?? this.prisma;
    return client.e2eeAttachment.create({ data });
  }

  async findById(id: string): Promise<E2eeAttachment | null> {
    return this.prisma.e2eeAttachment.findUnique({ where: { id } });
  }

  async findByStorageKey(storageKey: string): Promise<E2eeAttachment | null> {
    return this.prisma.e2eeAttachment.findUnique({ where: { storageKey } });
  }

  async findBySession(
    sessionId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<E2eeAttachment[]> {
    return this.prisma.e2eeAttachment.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async findByGroup(
    groupId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<E2eeAttachment[]> {
    return this.prisma.e2eeAttachment.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async findBySenderDevice(
    senderDeviceId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<E2eeAttachment[]> {
    return this.prisma.e2eeAttachment.findMany({
      where: { senderDeviceId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async updateStatus(
    id: string,
    status: 'PENDING' | 'UPLOADED' | 'FAILED' | 'DELETED',
    error?: string,
  ): Promise<E2eeAttachment> {
    return this.prisma.e2eeAttachment.update({
      where: { id },
      data: {
        status,
        uploadError: error,
      },
    });
  }

  async updateThumbnail(
    id: string,
    data: {
      thumbnailStorageKey: string;
      thumbnailMimeType: string;
      thumbnailSizeBytes: number;
      encryptedThumbnailKey: string;
      thumbnailHash: string;
    },
  ): Promise<E2eeAttachment> {
    return this.prisma.e2eeAttachment.update({
      where: { id },
      data,
    });
  }

  async linkMessage(id: string, messageId: string): Promise<E2eeAttachment> {
    return this.prisma.e2eeAttachment.update({
      where: { id },
      data: { messageId },
    });
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.prisma.e2eeAttachment.count({ where: { sessionId } });
  }

  async countByGroup(groupId: string): Promise<number> {
    return this.prisma.e2eeAttachment.count({ where: { groupId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.e2eeAttachment.delete({ where: { id } });
  }
}
