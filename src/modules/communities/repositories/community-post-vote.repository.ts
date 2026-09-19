import { Injectable } from '@nestjs/common';
import { CommunityPostVote, Prisma, VoteType } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import { COMMUNITY_POST_VOTE_SELECT } from '../constants/community-post.select';

export type CommunityPostVoteSelectRow = Prisma.CommunityPostVoteGetPayload<{
  select: typeof COMMUNITY_POST_VOTE_SELECT;
}>;

@Injectable()
export class CommunityPostVoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    postId: string,
    userId: string,
    vote: VoteType,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostVote> {
    const client = tx ?? this.prisma;

    return client.communityPostVote.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, vote },
      update: { vote },
      select: COMMUNITY_POST_VOTE_SELECT,
    });
  }

  async find(
    postId: string,
    userId: string,
  ): Promise<CommunityPostVote | null> {
    return this.prisma.communityPostVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });
  }

  async remove(
    postId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityPostVote.deleteMany({
      where: { postId, userId },
    });
  }

  async countByPost(postId: string): Promise<Record<VoteType, number>> {
    const grouped = await this.prisma.communityPostVote.groupBy({
      by: ['vote'],
      where: { postId },
      _count: { _all: true },
    });

    const counts: Record<VoteType, number> = {
      [VoteType.UPVOTE]: 0,
      [VoteType.DOWNVOTE]: 0,
    };

    for (const row of grouped) {
      counts[row.vote] = row._count._all;
    }

    return counts;
  }

  async listByPost(
    postId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityPostVoteSelectRow[]> {
    return this.prisma.communityPostVote.findMany({
      where: { postId, ...this.cursorWhere(cursor) },
      select: COMMUNITY_POST_VOTE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async listByUser(
    userId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunityPostVoteSelectRow[]> {
    return this.prisma.communityPostVote.findMany({
      where: { userId, ...this.cursorWhere(cursor) },
      select: COMMUNITY_POST_VOTE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async listForUserAndPosts(
    userId: string,
    postIds: string[],
  ): Promise<CommunityPostVote[]> {
    if (postIds.length === 0) {
      return [];
    }

    return this.prisma.communityPostVote.findMany({
      where: { userId, postId: { in: postIds } },
    });
  }

  /**
   * Cast or change a vote inside a managed transaction, keeping the post's
   * denormalized `upvoteCount` / `downvoteCount` in sync. Returns the final
   * vote row and whether the counts changed.
   */
  async castVote(
    postId: string,
    userId: string,
    vote: VoteType,
  ): Promise<{ vote: CommunityPostVote; countsChanged: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostVote.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (!existing) {
        const created = await tx.communityPostVote.create({
          data: { postId, userId, vote },
          select: COMMUNITY_POST_VOTE_SELECT,
        });

        await tx.communityPost.update({
          where: { id: postId },
          data:
            vote === VoteType.UPVOTE
              ? { upvoteCount: { increment: 1 } }
              : { downvoteCount: { increment: 1 } },
        });

        return { vote: created, countsChanged: true };
      }

      if (existing.vote === vote) {
        const current = await tx.communityPostVote.findUnique({
          where: { postId_userId: { postId, userId } },
          select: COMMUNITY_POST_VOTE_SELECT,
        });

        return { vote: current!, countsChanged: false };
      }

      const updated = await tx.communityPostVote.update({
        where: { postId_userId: { postId, userId } },
        data: { vote },
        select: COMMUNITY_POST_VOTE_SELECT,
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: {
          upvoteCount:
            existing.vote === VoteType.UPVOTE
              ? { decrement: 1 }
              : { increment: 1 },
          downvoteCount:
            existing.vote === VoteType.DOWNVOTE
              ? { decrement: 1 }
              : { increment: 1 },
        },
      });

      return { vote: updated, countsChanged: true };
    });
  }

  /**
   * Remove a vote and decrement the matching denormalized count. Returns
   * false when no vote exists.
   */
  async removeVoteAndCounts(postId: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostVote.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (!existing) {
        return false;
      }

      await tx.communityPostVote.delete({
        where: { postId_userId: { postId, userId } },
      });

      await tx.communityPost.update({
        where: { id: postId },
        data:
          existing.vote === VoteType.UPVOTE
            ? { upvoteCount: { decrement: 1 } }
            : { downvoteCount: { decrement: 1 } },
      });

      return true;
    });
  }

  private cursorWhere(
    cursor?: TwoFieldCursor,
  ): Prisma.CommunityPostVoteWhereInput {
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
