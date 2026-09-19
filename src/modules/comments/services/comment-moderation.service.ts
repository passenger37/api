import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CommentPostType, CommentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommentNotFoundException } from '../exceptions/comment.exceptions';
import { CommentReactionRepository } from '../repositories/comment-reaction.repository';
import { COMMENT_DEFAULTS } from '../constants/comment.constants';

@Injectable()
export class CommentModerationService {
  private readonly logger = new Logger(CommentModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reactionRepository: CommentReactionRepository,
  ) {}

  async removeComment(commentId: string, moderatorId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new CommentNotFoundException(commentId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.comment.update({
        where: { id: commentId },
        data: { status: CommentStatus.REMOVED, version: { increment: 1 } },
      });

      await this.reactionRepository.updateCommentCounts(
        commentId,
        { upvotes: 0, downvotes: 0 },
        tx,
      );
    });

    this.logger.log(
      `Comment removed: ${commentId} by moderator ${moderatorId}`,
    );
  }
}
