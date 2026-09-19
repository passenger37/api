import { Injectable } from '@nestjs/common';
import { Prisma, CommentReaction, VoteType } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommentReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    commentId: string,
    userId: string,
    vote: VoteType,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    reaction: CommentReaction;
    isNew: boolean;
    previousVote?: VoteType;
  }> {
    const client = tx ?? this.prisma;

    const existing = await client.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      if (existing.vote === vote) {
        return { reaction: existing, isNew: false };
      }

      const previousVote = existing.vote;
      const updated = await client.commentReaction.update({
        where: { id: existing.id },
        data: { vote },
      });
      return { reaction: updated, isNew: false, previousVote };
    }

    const created = await client.commentReaction.create({
      data: { commentId, userId, vote },
    });
    return { reaction: created, isNew: true };
  }

  async remove(
    commentId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CommentReaction | null> {
    const client = tx ?? this.prisma;

    const existing = await client.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (!existing) return null;

    return client.commentReaction.delete({ where: { id: existing.id } });
  }

  async findByCommentAndUser(
    commentId: string,
    userId: string,
  ): Promise<VoteType | null> {
    const reaction = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
      select: { vote: true },
    });
    return reaction?.vote ?? null;
  }

  async getVoteCounts(commentId: string): Promise<{
    upvotes: number;
    downvotes: number;
  }> {
    const counts = await this.prisma.commentReaction.groupBy({
      by: ['vote'],
      where: { commentId },
      _count: { vote: true },
    });

    const result = { upvotes: 0, downvotes: 0 };

    for (const count of counts) {
      if (count.vote === 'UPVOTE') result.upvotes = count._count.vote;
      if (count.vote === 'DOWNVOTE') result.downvotes = count._count.vote;
    }

    return result;
  }

  async updateCommentCounts(
    commentId: string,
    delta: { upvotes: number; downvotes: number },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.comment.update({
      where: { id: commentId },
      data: {
        upvoteCount: { increment: delta.upvotes },
        downvoteCount: { increment: delta.downvotes },
      },
    });
  }
}
