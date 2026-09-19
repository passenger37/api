import { Injectable } from '@nestjs/common';
import { CommunityPostBookmark, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import { COMMUNITY_POST_BOOKMARK_SELECT } from '../constants/community-post.select';

@Injectable()
export class CommunityPostBookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostBookmark> {
    const client = tx ?? this.prisma;

    return client.communityPostBookmark.create({
      data: { postId, userId },
      select: COMMUNITY_POST_BOOKMARK_SELECT,
    });
  }

  async remove(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;

    const result = await client.communityPostBookmark.deleteMany({
      where: { postId, userId },
    });

    return result.count > 0;
  }

  async find(
    postId: string,
    userId: string,
  ): Promise<CommunityPostBookmark | null> {
    return this.prisma.communityPostBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.communityPostBookmark.count({
      where: { postId },
    });
  }

  async listByUser(
    userId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityPostBookmark[]> {
    return this.prisma.communityPostBookmark.findMany({
      where: { userId, ...this.cursorWhere(cursor) },
      select: COMMUNITY_POST_BOOKMARK_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async listForUserAndPosts(
    userId: string,
    postIds: string[],
  ): Promise<CommunityPostBookmark[]> {
    if (postIds.length === 0) {
      return [];
    }

    return this.prisma.communityPostBookmark.findMany({
      where: { userId, postId: { in: postIds } },
    });
  }

  /**
   * Create a bookmark and increment the post's denormalized `bookmarkCount`
   * atomically.
   */
  async addWithCount(
    postId: string,
    userId: string,
  ): Promise<CommunityPostBookmark> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.communityPostBookmark.create({
        data: { postId, userId },
        select: COMMUNITY_POST_BOOKMARK_SELECT,
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      });

      return created;
    });
  }

  /**
   * Remove a bookmark and decrement the post's `bookmarkCount` atomically.
   * Returns false when no bookmark exists.
   */
  async removeWithCount(postId: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.communityPostBookmark.deleteMany({
        where: { postId, userId },
      });

      if (result.count === 0) {
        return false;
      }

      await tx.communityPost.update({
        where: { id: postId },
        data: { bookmarkCount: { decrement: 1 } },
      });

      return true;
    });
  }

  private cursorWhere(
    cursor?: TwoFieldCursor,
  ): Prisma.CommunityPostBookmarkWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
        },
      ],
    };
  }
}
