import { Injectable } from '@nestjs/common';
import { Prisma, PostReaction, ReactionType } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { POST_REACTION_SELECT } from '../constants/post.select';

@Injectable()
export class PostReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    postId: string,
    userId: string,
    type: ReactionType,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    reaction: PostReaction;
    isNew: boolean;
    previousType?: ReactionType;
  }> {
    const client = tx ?? this.prisma;

    const existing = await client.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      if (existing.type === type) {
        return { reaction: existing, isNew: false };
      }

      const previousType = existing.type;
      const updated = await client.postReaction.update({
        where: { id: existing.id },
        data: { type },
        select: POST_REACTION_SELECT,
      });
      return { reaction: updated, isNew: false, previousType };
    }

    const created = await client.postReaction.create({
      data: {
        postId,
        userId,
        type,
      },
      select: POST_REACTION_SELECT,
    });
    return { reaction: created, isNew: true };
  }

  async remove(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PostReaction | null> {
    const client = tx ?? this.prisma;

    const existing = await client.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (!existing) {
      return null;
    }

    return client.postReaction.delete({
      where: { id: existing.id },
      select: POST_REACTION_SELECT,
    });
  }

  async findByPostAndUser(
    postId: string,
    userId: string,
  ): Promise<PostReaction | null> {
    return this.prisma.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
      select: POST_REACTION_SELECT,
    });
  }

  async findByPost(
    postId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
      type?: ReactionType;
    },
  ): Promise<{
    items: PostReaction[];
    nextCursor: { createdAt: Date; id: string } | null;
  }> {
    const where: Prisma.PostReactionWhereInput = { postId };

    if (options.type) {
      where.type = options.type;
    }

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const reactions = await this.prisma.postReaction.findMany({
      where,
      select: POST_REACTION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = reactions.length > options.limit;
    const items = hasMore ? reactions.slice(0, options.limit) : reactions;
    const nextCursor =
      hasMore && items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }
        : null;

    return { items, nextCursor };
  }

  async getReactionCounts(postId: string): Promise<{
    LIKE: number;
    LOVE: number;
    HAHA: number;
    WOW: number;
    SAD: number;
    ANGRY: number;
    FIRE: number;
    CELEBRATE: number;
    total: number;
  }> {
    const counts = await this.prisma.postReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: { type: true },
    });

    const result = {
      LIKE: 0,
      LOVE: 0,
      HAHA: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
      FIRE: 0,
      CELEBRATE: 0,
      total: 0,
    };

    for (const count of counts) {
      result[count.type] = count._count.type;
      result.total += count._count.type;
    }

    return result;
  }

  async getViewerReaction(
    postId: string,
    userId: string,
  ): Promise<ReactionType | null> {
    const reaction = await this.prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { type: true },
    });
    return reaction?.type ?? null;
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.postReaction.count({ where: { postId } });
  }
}
