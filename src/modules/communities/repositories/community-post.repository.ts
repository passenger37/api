import { Injectable } from '@nestjs/common';
import {
  CommunityPost,
  CommunityPostStatus,
  CommunityPostVisibility,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { PostCursor } from '../pagination/community-cursor';
import { POST_EDIT_HISTORY_LIMIT } from '../constants/community-post.constants';
import { CommunityPostWithRelations } from '../types/community.types';
import { FeedSort } from '../types/community-post.types';

@Injectable()
export class CommunityPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityPostCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPost> {
    const client = tx ?? this.prisma;

    return client.communityPost.create({ data });
  }

  async findById(id: string): Promise<CommunityPostWithRelations | null> {
    return this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Full detail read including author, category, media, hashtags, mentions
   * (with their mentioned users) and rich relation counts.
   */
  async findDetail(id: string): Promise<CommunityPostWithRelations | null> {
    return this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: true,
        category: true,
        originalPost: { include: { author: true } },
        quotedPost: { include: { author: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        hashtags: true,
        mentions: { include: { mentionedUser: true } },
        _count: {
          select: {
            comments: true,
            votes: true,
            media: true,
            hashtags: true,
            mentions: true,
            reports: true,
            bookmarks: true,
            editHistory: true,
          },
        },
      },
    });
  }

  async findPage(
    communityId: string,
    limit: number,
    cursor?: PostCursor,
  ): Promise<CommunityPostWithRelations[]> {
    return this.prisma.communityPost.findMany({
      where: {
        communityId,
        isDeleted: false,
        ...this.cursorWhere(cursor),
      },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async findPageByCategory(
    communityId: string,
    categoryId: string,
    limit: number,
    cursor?: PostCursor,
  ): Promise<CommunityPostWithRelations[]> {
    return this.prisma.communityPost.findMany({
      where: {
        communityId,
        categoryId,
        isDeleted: false,
        ...this.cursorWhere(cursor),
      },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async update(
    id: string,
    data: Prisma.CommunityPostUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPost> {
    const client = tx ?? this.prisma;

    return client.communityPost.update({ where: { id }, data });
  }

  /**
   * Apply a post edit inside a transaction: update the post (bump `version`
   * and set `editedAt`), record the previous content in the edit history,
   * then prune history rows beyond the retention limit.
   */
  async updateContentWithHistory(
    id: string,
    data: Prisma.CommunityPostUpdateInput,
    previousContent: string,
    editedByUserId: string,
  ): Promise<CommunityPost> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.communityPost.update({
        where: { id },
        data: {
          ...data,
          editedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.communityPostEditHistory.create({
        data: {
          postId: id,
          previousContent,
          editedByUserId,
        },
      });

      const latest = await tx.communityPostEditHistory.findMany({
        where: { postId: id },
        orderBy: [{ editedAt: 'desc' }, { id: 'desc' }],
        take: POST_EDIT_HISTORY_LIMIT,
        select: { id: true },
      });

      if (latest.length >= POST_EDIT_HISTORY_LIMIT) {
        const keepIds = latest.map((row) => row.id);

        await tx.communityPostEditHistory.deleteMany({
          where: { postId: id, id: { notIn: keepIds } },
        });
      }

      return updated;
    });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityPost.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async incrementViewCount(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async countByCommunity(communityId: string): Promise<number> {
    return this.prisma.communityPost.count({
      where: { communityId, isDeleted: false },
    });
  }

  /**
   * Feed page for the community timeline. Returns `limit + 1` rows when a
   * cursor is provided, ordered per `sort`. Rows that are deleted, hidden,
   * or pending moderation are excluded from the public feed.
   */
  async findFeedPage(
    communityId: string,
    sort: FeedSort,
    limit: number,
    cursor?: {
      isPinned: boolean;
      sortKey: string;
      createdAt: string;
      id: string;
    },
    options?: { categoryId?: string; authorId?: string },
  ): Promise<CommunityPostWithRelations[]> {
    const visibleStatuses: CommunityPostStatus[] = [CommunityPostStatus.ACTIVE];

    return this.prisma.communityPost.findMany({
      where: {
        communityId,
        isDeleted: false,
        status: { in: visibleStatuses },
        visibility: {
          in: [
            CommunityPostVisibility.PUBLIC,
            CommunityPostVisibility.COMMUNITY_MEMBERS,
          ],
        },
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.authorId ? { authorUserId: options.authorId } : {}),
        ...this.feedCursorWhere(sort, cursor),
      },
      include: {
        author: true,
        category: true,
        originalPost: { include: { author: true } },
        quotedPost: { include: { author: true } },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: this.feedOrderBy(sort),
      take: limit + 1,
    });
  }

  private feedOrderBy(
    sort: FeedSort,
  ): Prisma.CommunityPostOrderByWithRelationInput[] {
    switch (sort) {
      case 'TOP':
        return [
          { isPinned: 'desc' },
          { upvoteCount: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      case 'CONTROVERSIAL':
        return [
          { isPinned: 'desc' },
          { downvoteCount: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      case 'HOT':
        return [
          { isPinned: 'desc' },
          { upvoteCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      case 'LATEST':
      default:
        return [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  /**
   * Build a cursor predicate selecting rows strictly AFTER the cursor in the
   * linear order produced by `feedOrderBy`. Each sort groups by `isPinned`
   * first; within the group, LATEST compares createdAt/id while keyed sorts
   * compare the leading numeric key then createdAt/id. HOT additionally
   * orders by commentCount between the key and createdAt; that middle key is
   * intentionally ignored by the predicate to keep a single code path.
   */
  private feedCursorWhere(
    sort: FeedSort,
    cursor?: {
      isPinned: boolean;
      sortKey: string;
      createdAt: string;
      id: string;
    },
  ): Prisma.CommunityPostWhereInput {
    if (!cursor) {
      return {};
    }

    const createdAt = new Date(cursor.createdAt);
    const sortKey = Number(cursor.sortKey);

    const timeAfter = {
      OR: [
        { createdAt: { lt: createdAt } },
        { AND: [{ createdAt: createdAt }, { id: { lt: cursor.id } }] },
      ],
    };

    if (sort === 'LATEST') {
      // orderBy: [isPinned desc, createdAt desc, id desc]
      return cursor.isPinned
        ? {
            OR: [{ AND: [{ isPinned: true }, timeAfter] }, { isPinned: false }],
          }
        : { AND: [{ isPinned: false }, timeAfter] };
    }

    const keyField = sort === 'CONTROVERSIAL' ? 'downvoteCount' : 'upvoteCount';

    const keyAfter = {
      OR: [
        { [keyField]: { lt: sortKey } },
        {
          AND: [{ [keyField]: sortKey }, timeAfter],
        },
      ],
    };

    // orderBy (keyed): [isPinned desc, keyField desc, createdAt desc, id desc]
    return cursor.isPinned
      ? {
          OR: [{ AND: [{ isPinned: true }, keyAfter] }, { isPinned: false }],
        }
      : { AND: [{ isPinned: false }, keyAfter] };
  }

  /**
   * Build a "rows strictly before this cursor in [isPinned desc, createdAt
   * desc, id desc] order" predicate.
   */
  private cursorWhere(cursor?: PostCursor): Prisma.CommunityPostWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        // A row is "before" the cursor if it's pinned while the cursor isn't.
        cursor.isPinned
          ? {}
          : {
              OR: [
                { isPinned: true },
                {
                  AND: [
                    { isPinned: false },
                    { createdAt: { lt: cursor.createdAt } },
                  ],
                },
                {
                  AND: [
                    { isPinned: false },
                    { createdAt: cursor.createdAt },
                    { id: { lt: cursor.id } },
                  ],
                },
              ],
            },
        // Cursor is pinned: only the same-pinned-group rows that are older
        // or same-time-with-smaller-id are "before" the cursor.
        {
          AND: [{ isPinned: true }, { createdAt: { lt: cursor.createdAt } }],
        },
        {
          AND: [
            { isPinned: true },
            { createdAt: cursor.createdAt },
            { id: { lt: cursor.id } },
          ],
        },
      ],
    };
  }
}
