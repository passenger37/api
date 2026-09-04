import { Injectable } from '@nestjs/common';
import { CommunityComment, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import { CommunityCommentWithRelations } from '../types/community.types';

@Injectable()
export class CommunityCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityCommentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityComment> {
    const client = tx ?? this.prisma;

    return client.communityComment.create({ data });
  }

  async findById(id: string): Promise<CommunityComment | null> {
    return this.prisma.communityComment.findUnique({ where: { id } });
  }

  async listPostComments(
    postId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityCommentWithRelations[]> {
    return this.prisma.communityComment.findMany({
      where: {
        postId,
        parentId: null,
        isDeleted: false,
        ...this.cursorWhere(cursor),
      },
      include: {
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          include: {
            replies: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async update(
    id: string,
    data: Prisma.CommunityCommentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityComment> {
    const client = tx ?? this.prisma;

    return client.communityComment.update({ where: { id }, data });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityComment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.communityComment.count({
      where: { postId, isDeleted: false },
    });
  }

  /**
   * Build a "rows strictly after this cursor in [createdAt asc, id asc]
   * order" predicate.
   */
  private cursorWhere(cursor?: TwoFieldCursor): Prisma.CommunityCommentWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        {
          AND: [
            { createdAt: cursor.createdAt },
            { id: { gt: cursor.id } },
          ],
        },
      ],
    };
  }
}
