import { Injectable } from '@nestjs/common';
import { Prisma, Comment, CommentStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommentWithAuthor } from '../types/comment.types';
import { COMMENT_SORT, CommentSortMode, decodeCommentCursor } from '../constants/comment.constants';

const COMMENT_AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} as const;

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      postId: string;
      postType: 'PERSONAL' | 'COMMUNITY' | 'CHANNEL';
      parentCommentId?: string;
      authorId: string;
      content: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Comment> {
    const client = tx ?? this.prisma;

    return client.comment.create({
      data: {
        postId: data.postId,
        postType: data.postType,
        parentCommentId: data.parentCommentId,
        authorId: data.authorId,
        content: data.content,
      },
    });
  }

  async findById(id: string): Promise<Comment | null> {
    return this.prisma.comment.findUnique({ where: { id } });
  }

  async findByIdWithAuthor(id: string): Promise<CommentWithAuthor | null> {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    }) as Promise<CommentWithAuthor | null>;
  }

  async update(
    id: string,
    data: {
      content?: string;
      status?: CommentStatus;
      editedAt?: Date;
      deletedAt?: Date;
      version?: number | { increment: number };
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Comment> {
    const client = tx ?? this.prisma;

    return client.comment.update({
      where: { id },
      data: data.version === undefined
        ? data
        : { ...data, version: data.version as number },
    });
  }

  async incrementReplyCount(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.comment.update({
      where: { id },
      data: { replyCount: { increment: 1 } },
    });
  }

  async decrementReplyCount(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.comment.update({
      where: { id },
      data: { replyCount: { decrement: 1 } },
    });
  }

  async listRootComments(
    postId: string,
    postType: string,
    limit: number,
    sort: CommentSortMode,
    cursor?: string,
  ): Promise<CommentWithAuthor[]> {
    const orderBy = this.buildSortOrder(sort);
    const where: Prisma.CommentWhereInput = {
      postId,
      postType: postType as any,
      parentCommentId: null,
      status: { not: CommentStatus.REMOVED },
    };

    if (cursor) {
      const decoded = decodeCommentCursor(cursor);
      Object.assign(where, {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { AND: [{ createdAt: decoded.createdAt }, { id: { lt: decoded.id } }] },
        ],
      });
    }

    return this.prisma.comment.findMany({
      where,
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
      orderBy,
      take: limit,
    }) as Promise<CommentWithAuthor[]>;
  }

  async listReplies(
    parentCommentId: string,
    limit: number,
    sort: CommentSortMode,
    cursor?: string,
  ): Promise<CommentWithAuthor[]> {
    const orderBy = this.buildSortOrder(sort);
    const where: Prisma.CommentWhereInput = {
      parentCommentId,
      status: { not: CommentStatus.REMOVED },
    };

    if (cursor) {
      const decoded = decodeCommentCursor(cursor);
      Object.assign(where, {
        OR: [
          { createdAt: { gt: decoded.createdAt } },
          { AND: [{ createdAt: decoded.createdAt }, { id: { gt: decoded.id } }] },
        ],
      });
    }

    return this.prisma.comment.findMany({
      where,
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
      orderBy,
      take: limit,
    }) as Promise<CommentWithAuthor[]>;
  }

  async countByPost(postId: string, postType: string): Promise<number> {
    return this.prisma.comment.count({
      where: {
        postId,
        postType: postType as any,
        status: { not: CommentStatus.REMOVED },
      },
    });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.comment.update({
      where: { id },
      data: {
        status: CommentStatus.DELETED,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  private buildSortOrder(sort: CommentSortMode) {
    switch (sort) {
      case COMMENT_SORT.BEST:
        return [
          { status: 'asc' as const },
          { upvoteCount: 'desc' as const },
          { createdAt: 'asc' as const },
          { id: 'asc' as const },
        ];
      case COMMENT_SORT.TOP:
        return [
          { upvoteCount: 'desc' as const },
          { createdAt: 'asc' as const },
          { id: 'asc' as const },
        ];
      case COMMENT_SORT.NEW:
        return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
      case COMMENT_SORT.OLD:
      default:
        return [{ createdAt: 'asc' as const }, { id: 'asc' as const }];
    }
  }
}
