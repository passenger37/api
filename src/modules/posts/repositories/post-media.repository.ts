import { Injectable } from '@nestjs/common';
import { Prisma, PostMedia } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PostMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    postId: string,
    media: Array<{
      type: string;
      url: string;
      thumbnailUrl?: string;
      width?: number;
      height?: number;
      duration?: number;
      fileSize: bigint | number;
      mimeType: string;
      metadata?: Prisma.InputJsonValue;
      order: number;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<PostMedia[]> {
    const client = tx ?? this.prisma;

    const creates = media.map((m) =>
      client.postMedia.create({
        data: {
          postId,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          width: m.width,
          height: m.height,
          duration: m.duration,
          fileSize: typeof m.fileSize === 'bigint' ? m.fileSize : BigInt(m.fileSize),
          mimeType: m.mimeType,
          metadata: m.metadata,
          order: m.order,
        },
        select: {
          id: true,
          postId: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          duration: true,
          fileSize: true,
          mimeType: true,
          metadata: true,
          order: true,
          createdAt: true,
        },
      }),
    );

    if (tx) {
      return Promise.all(creates);
    }
    return this.prisma.$transaction(creates);
  }

  async findByPost(postId: string): Promise<PostMedia[]> {
    return this.prisma.postMedia.findMany({
      where: { postId },
      select: {
        id: true,
        postId: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        metadata: true,
        order: true,
        createdAt: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  async removeByPost(postId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.postMedia.deleteMany({ where: { postId } });
    return result.count;
  }

  async update(
    id: string,
    data: Partial<{
      thumbnailUrl: string | null;
      width: number | null;
      height: number | null;
      metadata: Prisma.InputJsonValue | null;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<PostMedia> {
    const client = tx ?? this.prisma;
    return client.postMedia.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata ?? undefined,
      },
      select: {
        id: true,
        postId: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        metadata: true,
        order: true,
        createdAt: true,
      },
    });
  }
}