import { Injectable } from '@nestjs/common';
import { CommunityPostMedia, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { COMMUNITY_POST_MEDIA_SELECT } from '../constants/community-post.select';

export interface CommunityPostMediaInput {
  mediaId?: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  mimeType: string;
  sortOrder: number;
  altText?: string | null;
  focalPointX?: number | null;
  focalPointY?: number | null;
  userId?: string | null;
}

@Injectable()
export class CommunityPostMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    postId: string,
    media: CommunityPostMediaInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostMedia[]> {
    const client = tx ?? this.prisma;

    const creates = media.map((m) =>
      client.communityPostMedia.create({
        data: {
          postId,
          mediaId: m.mediaId ?? null,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
          width: m.width ?? null,
          height: m.height ?? null,
          duration: m.duration ?? null,
          mimeType: m.mimeType,
          sortOrder: m.sortOrder,
          altText: m.altText ?? null,
          focalPointX: m.focalPointX ?? null,
          focalPointY: m.focalPointY ?? null,
          userId: m.userId ?? null,
        },
        select: COMMUNITY_POST_MEDIA_SELECT,
      }),
    );

    if (tx) {
      return Promise.all(creates);
    }
    return this.prisma.$transaction(creates);
  }

  async listByPost(postId: string): Promise<CommunityPostMedia[]> {
    return this.prisma.communityPostMedia.findMany({
      where: { postId },
      select: COMMUNITY_POST_MEDIA_SELECT,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async replaceForPost(
    postId: string,
    media: CommunityPostMediaInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostMedia[]> {
    const client = tx ?? this.prisma;

    const remove = client.communityPostMedia.deleteMany({ where: { postId } });
    const created = this.createMany(postId, media, tx);

    if (tx) {
      await remove;
      return created;
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.communityPostMedia.deleteMany({ where: { postId } });
      return this.createMany(postId, media, transaction);
    });
  }

  async removeByPost(
    postId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.communityPostMedia.deleteMany({
      where: { postId },
    });

    return result.count;
  }
}
