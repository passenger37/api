import { Injectable } from '@nestjs/common';
import { CommunityPost, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { PostCursor } from '../pagination/community-cursor';
import { CommunityPostWithRelations } from '../types/community.types';

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

  async countByCommunity(communityId: string): Promise<number> {
    return this.prisma.communityPost.count({
      where: { communityId, isDeleted: false },
    });
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
          AND: [
            { isPinned: true },
            { createdAt: { lt: cursor.createdAt } },
          ],
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
