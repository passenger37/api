import { Injectable } from '@nestjs/common';
import { MessageAttachment, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class MessageAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MessageAttachmentUncheckedCreateInput) {
    return this.prisma.messageAttachment.create({
      data,
    });
  }

  async findById(id: string): Promise<MessageAttachment | null> {
    return this.prisma.messageAttachment.findUnique({
      where: {
        id,
      },
    });
  }

  async countPending(channelId: string, uploadedById: string) {
    return this.prisma.messageAttachment.count({
      where: {
        channelId,
        uploadedById,
        status: 'PENDING',
      },
    });
  }

  async markUploaded(
    id: string,
    sizeBytes: number,
  ): Promise<MessageAttachment> {
    return this.prisma.messageAttachment.update({
      where: {
        id,
      },

      data: {
        status: 'UPLOADED',
        sizeBytes,
      },
    });
  }

  async markFailed(id: string): Promise<MessageAttachment> {
    return this.prisma.messageAttachment.update({
      where: {
        id,
      },

      data: {
        status: 'FAILED',
      },
    });
  }

  async attachToMessage(
    messageId: string,
    channelId: string,
    uploaderMemberId: string,
    attachmentIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.messageAttachment.updateMany({
      where: {
        id: {
          in: attachmentIds,
        },

        channelId,

        uploadedById: uploaderMemberId,

        status: 'UPLOADED',

        messageId: null,
      },

      data: {
        messageId,
      },
    });
  }
}
