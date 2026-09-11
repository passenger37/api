import { Injectable } from '@nestjs/common';
import { DirectMessageAttachment, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DirectMessageAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.DirectMessageAttachmentUncheckedCreateInput,
  ): Promise<DirectMessageAttachment> {
    return this.prisma.directMessageAttachment.create({
      data,
    });
  }

  async findById(id: string): Promise<DirectMessageAttachment | null> {
    return this.prisma.directMessageAttachment.findUnique({
      where: {
        id,
      },
    });
  }

  async countPending(channelId: string, uploadedById: string): Promise<number> {
    return this.prisma.directMessageAttachment.count({
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
  ): Promise<DirectMessageAttachment> {
    return this.prisma.directMessageAttachment.update({
      where: {
        id,
      },

      data: {
        status: 'UPLOADED',
        sizeBytes,
      },
    });
  }

  async markFailed(id: string): Promise<DirectMessageAttachment> {
    return this.prisma.directMessageAttachment.update({
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
    uploadedById: string,
    attachmentIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.directMessageAttachment.updateMany({
      where: {
        id: {
          in: attachmentIds,
        },

        channelId,

        uploadedById,

        status: 'UPLOADED',

        messageId: null,
      },

      data: {
        messageId,
      },
    });
  }

  async findByMessageIds(
    messageIds: string[],
  ): Promise<DirectMessageAttachment[]> {
    if (messageIds.length === 0) {
      return [];
    }

    return this.prisma.directMessageAttachment.findMany({
      where: {
        messageId: {
          in: messageIds,
        },
        status: 'UPLOADED',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
