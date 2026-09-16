import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommentPostType, VoteType, CommentStatus } from '@prisma/client';

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
import { CommentNotificationPublisher } from './comment-notification.publisher';
import { CommentRealtimePublisher } from './comment-realtime.publisher';

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
    private readonly notificationPublisher: CommentNotificationPublisher,
    private readonly realtimePublisher: CommentRealtimePublisher,
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

      // Increment denormalized comment count on the parent post
      await this.incrementPostCommentCount(input.postId, input.postType, tx);

      return created;
    });

    this.logger.log(
      `Comment created: ${comment.id} on ${input.postType}:${input.postId}`,
    );

    // Decoupled notifications: root comment → post author; reply → parent's
    // author; any content mentioning @username → mentioned users.
    if (input.parentCommentId) {
      const parent = await this.commentRepository.findById(input.parentCommentId);
      await this.notificationPublisher.publishCommentReply({
        postId: input.postId,
        postType: input.postType,
        parentCommentId: input.parentCommentId,
        commentId: comment.id,
        parentAuthorId: parent?.authorId ?? '',
        actorUserId: input.authorId,
      });
    } else {
      await this.notificationPublisher.publishCommentOnPost({
        postId: input.postId,
        postType: input.postType,
        commentId: comment.id,
        postAuthorId: postContext.authorId,
        actorUserId: input.authorId,
      });
    }

    const mentionedUserIds = await this.resolveMentionedUserIds(input.content);
    if (mentionedUserIds.length > 0) {
      await this.notificationPublisher.publishCommentMentions({
        commentId: comment.id,
        mentionedUserIds,
        actorUserId: input.authorId,
      });
    }

    const commentWithAuthor = await this.commentRepository.findByIdWithAuthor(comment.id);

    const response = CommentMapper.toResponse(commentWithAuthor!, {
      viewerVote: null,
      viewerCanEdit: true,
      viewerCanDelete: true,
      viewerCanModerate: false,
    });

    await this.realtimePublisher.publishCommentCreated(response);

    return response;
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

    const response = CommentMapper.toResponse(
      { ...updated, author: existing.author } as any,
      {
        viewerVote: null,
        viewerCanEdit: true,
        viewerCanDelete: true,
        viewerCanModerate: false,
      },
    );

    await this.realtimePublisher.publishCommentUpdated(response);

    return response;
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

    await this.prisma.$transaction(async (tx) => {
      await this.commentRepository.softDelete(commentId, tx);
      await this.decrementPostCommentCount(existing.postId, existing.postType, tx);
    });

    await this.realtimePublisher.publishCommentDeleted({
      postId: existing.postId,
      postType: existing.postType,
      commentId,
      status: 'DELETED' as CommentStatus,
    });
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

    await this.prisma.$transaction(async (tx) => {
      await this.commentRepository.update(commentId, {
        status: CommentStatus.REMOVED,
      }, tx);
      await this.decrementPostCommentCount(existing.postId, existing.postType, tx);
    });

    await this.realtimePublisher.publishCommentDeleted({
      postId: existing.postId,
      postType: existing.postType,
      commentId,
      status: 'REMOVED' as CommentStatus,
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

      // Compute aggregate deltas for the denormalized counts.
      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (reactionResult.isNew) {
        if (input.vote === 'UPVOTE') upvoteDelta = 1;
        else downvoteDelta = 1;
      } else if (reactionResult.previousVote) {
        const previous = reactionResult.previousVote;
        const next = input.vote;

        if (previous === 'UPVOTE') upvoteDelta -= 1;
        if (previous === 'DOWNVOTE') downvoteDelta -= 1;
        if (next === 'UPVOTE') upvoteDelta += 1;
        if (next === 'DOWNVOTE') downvoteDelta += 1;
      }

      await this.reactionRepository.updateCommentCounts(
        input.commentId,
        { upvotes: upvoteDelta, downvotes: downvoteDelta },
        tx,
      );

      const scoreDelta = upvoteDelta - downvoteDelta;

      return { vote: input.vote, scoreDelta };
    });

    await this.notificationPublisher.publishCommentReaction({
      commentId: input.commentId,
      commentAuthorId: existing.authorId,
      actorUserId: input.userId,
      vote: input.vote,
    });

    await this.realtimePublisher.publishCommentReaction({
      postId: existing.postId,
      postType: existing.postType,
      commentId: input.commentId,
      vote: input.vote,
      scoreDelta: result.scoreDelta,
    });

    return result;
  }

  async removeReaction(commentId: string, userId: string): Promise<{ scoreDelta: number }> {
    const existing = await this.commentRepository.findById(commentId);

    if (!existing) {
      throw new CommentNotFoundException(commentId);
    }

    const postContext = await this.authorizationService.resolvePost(
      existing.postId,
      existing.postType,
    );

    await this.authorizationService.assertCanAccessPost(postContext, userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const removed = await this.reactionRepository.remove(commentId, userId, tx);

      if (!removed) {
        return { scoreDelta: 0 };
      }

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (removed.vote === 'UPVOTE') upvoteDelta = -1;
      else downvoteDelta = -1;

      await this.reactionRepository.updateCommentCounts(
        commentId,
        { upvotes: upvoteDelta, downvotes: downvoteDelta },
        tx,
      );

      const scoreDelta = upvoteDelta - downvoteDelta;

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

  private async resolveMentionedUserIds(content: string): Promise<string[]> {
    const usernames = [...content.matchAll(/@([a-zA-Z0-9_]+)/g)]
      .map((match) => match[1])
      .filter((value, index, all) => all.indexOf(value) === index);

    if (usernames.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private async incrementPostCommentCount(
    postId: string,
    postType: CommentPostType,
    tx: any,
  ): Promise<void> {
    switch (postType) {
      case 'PERSONAL':
      case 'CHANNEL':
        await tx.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        });
        break;
      case 'COMMUNITY':
        await tx.communityPost.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        });
        break;
    }
  }

  private async decrementPostCommentCount(
    postId: string,
    postType: CommentPostType,
    tx: any,
  ): Promise<void> {
    switch (postType) {
      case 'PERSONAL':
      case 'CHANNEL':
        await tx.post.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
        });
        break;
      case 'COMMUNITY':
        await tx.communityPost.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
        });
        break;
    }
  }
}
