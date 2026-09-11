import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommentPostType, VoteType } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommentRepository } from '../repositories/comment.repository';
import { CommentReactionRepository } from '../repositories/comment-reaction.repository';
import { COMMENT_DEFAULTS } from '../constants/comment.constants';
import {
  CommentNotFoundException,
  PostNotFoundException,
  CrossPostReplyException,
  CommentContentTooLongException,
  CommentContentEmptyException,
} from '../exceptions/comment.exceptions';
import { CommentResponseData } from '../types/comment.types';
import { CommentMapper } from '../mappers/comment.mapper';
import { CommentAuthorizationService } from './comment-authorization.service';

interface CreateCommentInput {
  postId: string;
  postType: CommentPostType;
  authorId: string;
  content: string;
  parentCommentId?: string;
}

interface EditCommentInput {
  commentId: string;
  authorId: string;
  content: string;
}

interface ReactToCommentInput {
  commentId: string;
  userId: string;
  vote: VoteType;
}

@Injectable()
export class CommentCommandService {
  private readonly logger = new Logger(CommentCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentRepository: CommentRepository,
    private readonly reactionRepository: CommentReactionRepository,
    private readonly authorizationService: CommentAuthorizationService,
  ) {}

  async createComment(input: CreateCommentInput): Promise<CommentResponseData> {
    this.validateContent(input.content);

    const postContext = await this.authorizationService.resolvePost(
      input.postId,
      input.postType,
    );

    await this.authorizationService.assertCanAccessPost(postContext, input.authorId);

    if (input.parentCommentId) {
      const parent = await this.commentRepository.findById(input.parentCommentId);

      if (!parent) {
        throw new CommentNotFoundException(input.parentCommentId);
      }

      if (parent.postId !== input.postId) {
        throw new CrossPostReplyException();
      }
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await this.commentRepository.create(
        {
          postId: input.postId,
          postType: input.postType,
          parentCommentId: input.parentCommentId,
          authorId: input.authorId,
          content: input.content.trim(),
        },
        tx,
      );

      if (input.parentCommentId) {
        await this.commentRepository.incrementReplyCount(input.parentCommentId, tx);
      }

      // Denormalized count increment would go here (update post's commentCount)
      // Delegated to the calling domain via events

      return created;
    });

    this.logger.log(
      `Comment created: ${comment.id} on ${input.postType}:${input.postId}`,
    );

    const commentWithAuthor = await this.commentRepository.findByIdWithAuthor(comment.id);

    return CommentMapper.toResponse(commentWithAuthor!, {
      viewerVote: null,
      viewerCanEdit: true,
      viewerCanDelete: true,
      viewerCanModerate: false,
    });
  }

  async editComment(input: EditCommentInput): Promise<CommentResponseData> {
    this.validateContent(input.content);

    const existing = await this.commentRepository.findByIdWithAuthor(input.commentId);

    if (!existing) {
      throw new CommentNotFoundException(input.commentId);
    }

    const postContext = await this.authorizationService.resolvePost(
      existing.postId,
      existing.postType,
    );

    // Author verification is the primary gate; ownership is enforced below.
    await this.authorizationService.assertCanAccessPost(postContext, input.authorId);

    if (existing.authorId !== input.authorId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    const updated = await this.commentRepository.update(
      input.commentId,
      {
        content: input.content.trim(),
        editedAt: new Date(),
      },
    );

    return CommentMapper.toResponse(
      { ...updated, author: existing.author } as any,
      {
        viewerVote: null,
        viewerCanEdit: true,
        viewerCanDelete: true,
        viewerCanModerate: false,
      },
    );
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const existing = await this.commentRepository.findById(commentId);

    if (!existing) {
      throw new CommentNotFoundException(commentId);
    }

    const postContext = await this.authorizationService.resolvePost(
      existing.postId,
      existing.postType,
    );

    await this.authorizationService.assertCanAccessPost(postContext, userId);

    if (existing.authorId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.commentRepository.softDelete(commentId);
  }

  async removeComment(commentId: string, moderatorId: string): Promise<void> {
    const existing = await this.commentRepository.findById(commentId);

    if (!existing) {
      throw new CommentNotFoundException(commentId);
    }

    const postContext = await this.authorizationService.resolvePost(
      existing.postId,
      existing.postType,
    );

    const canModerate = await this.authorizationService.canModerate(
      postContext,
      moderatorId,
    );

    if (!canModerate) {
      throw new BadRequestException(
        'You do not have permission to moderate comments on this post',
      );
    }

    await this.commentRepository.update(commentId, {
      status: 'REMOVED' as any,
    });
  }

  async reactToComment(input: ReactToCommentInput): Promise<{ vote: VoteType; scoreDelta: number }> {
    const existing = await this.commentRepository.findById(input.commentId);

    if (!existing) {
      throw new CommentNotFoundException(input.commentId);
    }

    const postContext = await this.authorizationService.resolvePost(
      existing.postId,
      existing.postType,
    );

    await this.authorizationService.assertCanAccessPost(postContext, input.userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const reactionResult = await this.reactionRepository.upsert(
        input.commentId,
        input.userId,
        input.vote,
        tx,
      );

      let scoreDelta = 0;

      if (reactionResult.isNew) {
        scoreDelta = input.vote === 'UPVOTE' ? 1 : -1;
      } else if (reactionResult.previousVote) {
        // Changed vote: undo previous + apply new
        const prev = reactionResult.previousVote === 'UPVOTE' ? 1 : -1;
        const next = input.vote === 'UPVOTE' ? 1 : -1;
        scoreDelta = next - prev;
      }

      await this.reactionRepository.updateCommentCounts(
        input.commentId,
        {
          upvotes: scoreDelta > 0 ? 1 : 0,
          downvotes: scoreDelta < 0 ? 1 : 0,
        },
        tx,
      );

      return { vote: input.vote, scoreDelta };
    });

    return result;
  }

  async removeReaction(commentId: string, userId: string): Promise<{ scoreDelta: number }> {
    const existing = await this.commentRepository.findById(commentId);

    if (!existing) {
      throw new CommentNotFoundException(commentId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const removed = await this.reactionRepository.remove(commentId, userId, tx);

      if (!removed) {
        return { scoreDelta: 0 };
      }

      const scoreDelta = removed.vote === 'UPVOTE' ? -1 : 1;

      await this.reactionRepository.updateCommentCounts(
        commentId,
        {
          upvotes: scoreDelta < 0 ? -1 : 0,
          downvotes: scoreDelta > 0 ? -1 : 0,
        },
        tx,
      );

      return { scoreDelta };
    });

    return result;
  }

  private validateContent(content: string): void {
    if (!content?.trim()) {
      throw new CommentContentEmptyException();
    }

    if (content.length > COMMENT_DEFAULTS.MAX_CONTENT_LENGTH) {
      throw new CommentContentTooLongException(COMMENT_DEFAULTS.MAX_CONTENT_LENGTH);
    }
  }
}
