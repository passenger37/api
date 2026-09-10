import { Injectable } from '@nestjs/common';
import { Prisma, PostSave } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PostBookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PostSave> {
    const client = tx ?? this.prisma;

    return client.postSave.create({
      data: { postId, userId },
    });
  }

  async remove(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PostSave | null> {
    const client = tx ?? this.prisma;

    const existing = await client.postSave.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existing) {
      return null;
    }

    return client.postSave.delete({
      where: { id: existing.id },
    });
  }

  async exists(postId: string, userId: string): Promise<boolean> {
    const bookmark = await this.prisma.postSave.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });
    return !!bookmark;
  }

  async findByUser(
    userId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{ items: (PostSave & { Post: any })[]; nextCursor: { createdAt: Date; id: string } | null }> {
    const where: Prisma.PostSaveWhereInput = { userId };

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const bookmarks = await this.prisma.postSave.findMany({
      where,
      include: {
        Post: {
          select: {
            id: true,
            authorId: true,
            content: true,
            contentType: true,
            visibility: true,
            status: true,
            reactionCount: true,
            commentCount: true,
            repostCount: true,
            createdAt: true,
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = bookmarks.length > options.limit;
    const items = hasMore ? bookmarks.slice(0, options.limit) : bookmarks;
    const nextCursor = hasMore && items.length > 0
      ? { createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id }
      : null;

    return { items, nextCursor };
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.postSave.count({ where: { postId } });
  }
}