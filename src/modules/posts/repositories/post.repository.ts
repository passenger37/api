import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Post,
  PostStatus,
  PostVisibility,
  PostContentType,
  PostType,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { POST_LIST_SELECT, POST_DETAIL_SELECT } from '../constants/post.select';

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      authorId: string;
      content?: string;
      contentType: PostContentType;
      visibility: PostVisibility;
      type?: PostType;
      scheduledAt?: Date;
      originalPostId?: string;
      quotedPostId?: string;
      contentWarning?: string;
      isSensitive?: boolean;
      language?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.post.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        contentType: data.contentType,
        visibility: data.visibility,
        type: data.type ?? PostType.POST,
        scheduledAt: data.scheduledAt,
        originalPostId: data.originalPostId,
        quotedPostId: data.quotedPostId,
        contentWarning: data.contentWarning,
        isSensitive: data.isSensitive ?? false,
        language: data.language,
        status: data.scheduledAt ? PostStatus.ACTIVE : PostStatus.ACTIVE,
      },
      select: POST_DETAIL_SELECT,
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.post.findUnique({
      where: { id },
      select: POST_DETAIL_SELECT,
    });
  }

  async findByIdForUpdate(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Post | null> {
    const client = tx ?? this.prisma;

    return client.post.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Partial<{
      content: string;
      contentType: PostContentType;
      visibility: PostVisibility;
      contentWarning: string | null;
      isSensitive: boolean;
      language: string | null;
      status: PostStatus;
      editedAt: Date;
      hiddenAt: Date | null;
      hiddenReason: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.post.update({
      where: { id },
      data,
      select: POST_DETAIL_SELECT,
    });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.post.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: PostStatus.DELETED,
      },
      select: POST_DETAIL_SELECT,
    });
  }

  async restore(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.post.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        status: PostStatus.ACTIVE,
      },
      select: POST_DETAIL_SELECT,
    });
  }

  async incrementCount(
    id: string,
    field: 'reactionCount' | 'commentCount' | 'repostCount' | 'viewCount',
    amount = 1,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.post.update({
      where: { id },
      data: {
        [field]: { increment: amount },
      },
    });
  }

  async decrementCount(
    id: string,
    field: 'reactionCount' | 'commentCount' | 'repostCount',
    amount = 1,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.post.update({
      where: { id },
      data: {
        [field]: { decrement: amount },
      },
    });
  }

  async findUserPosts(
    authorId: string,
    viewerId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
      visibility?: PostVisibility[];
      status?: PostStatus[];
    },
  ): Promise<{
    items: any[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostWhereInput = {
      authorId,
      status: { in: options.status ?? [PostStatus.ACTIVE] },
    };

    if (options.visibility) {
      where.visibility = { in: options.visibility };
    }

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const posts = await this.prisma.post.findMany({
      where,
      select: POST_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = posts.length > options.limit;
    const items = hasMore ? posts.slice(0, options.limit) : posts;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async findFeedPosts(
    authorIds: string[],
    viewerId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{
    items: any[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostWhereInput = {
      authorId: { in: authorIds },
      status: PostStatus.ACTIVE,
      visibility: {
        in: [
          PostVisibility.PUBLIC,
          PostVisibility.FOLLOWERS,
          PostVisibility.FRIENDS,
        ],
      },
      isDeleted: false,
    };

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const posts = await this.prisma.post.findMany({
      where,
      select: POST_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = posts.length > options.limit;
    const items = hasMore ? posts.slice(0, options.limit) : posts;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async findPublicPosts(options: {
    cursor?: { createdAt: Date; id: string } | null;
    limit: number;
    authorId?: string;
    tag?: string;
  }): Promise<{
    items: any[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostWhereInput = {
      status: PostStatus.ACTIVE,
      visibility: PostVisibility.PUBLIC,
      isDeleted: false,
    };

    if (options.authorId) {
      where.authorId = options.authorId;
    }

    if (options.tag) {
      where.hashtags = { some: { tag: options.tag.toLowerCase() } };
    }

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const posts = await this.prisma.post.findMany({
      where,
      select: POST_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = posts.length > options.limit;
    const items = hasMore ? posts.slice(0, options.limit) : posts;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async findReposts(
    originalPostId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{
    items: any[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostWhereInput = {
      originalPostId,
      status: PostStatus.ACTIVE,
      isDeleted: false,
    };

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const posts = await this.prisma.post.findMany({
      where,
      select: POST_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = posts.length > options.limit;
    const items = hasMore ? posts.slice(0, options.limit) : posts;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async findQuotes(
    quotedPostId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{
    items: any[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostWhereInput = {
      quotedPostId,
      status: PostStatus.ACTIVE,
      isDeleted: false,
    };

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const posts = await this.prisma.post.findMany({
      where,
      select: POST_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = posts.length > options.limit;
    const items = hasMore ? posts.slice(0, options.limit) : posts;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async existsById(id: string): Promise<boolean> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!post;
  }

  async countUserPosts(authorId: string, status?: PostStatus): Promise<number> {
    return this.prisma.post.count({
      where: {
        authorId,
        status: status ? { equals: status } : { not: PostStatus.DELETED },
      },
    });
  }

  async countFeedPosts(authorIds: string[]): Promise<number> {
    return this.prisma.post.count({
      where: {
        authorId: { in: authorIds },
        status: PostStatus.ACTIVE,
        visibility: {
          in: [
            PostVisibility.PUBLIC,
            PostVisibility.FOLLOWERS,
            PostVisibility.FRIENDS,
          ],
        },
        isDeleted: false,
      },
    });
  }
}
