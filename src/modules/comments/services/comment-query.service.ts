import { Injectable, Logger } from '@nestjs/common';
import { CommentPostType, VoteType } from '@prisma/client';

import { CommentRepository } from '../repositories/comment.repository';
import { CommentReactionRepository } from '../repositories/comment-reaction.repository';
import { CommentNotFoundException } from '../exceptions/comment.exceptions';
import { CommentResponseData, CommentListResponse } from '../types/comment.types';
import { CommentMapper } from '../mappers/comment.mapper';
import { COMMENT_DEFAULTS, CommentSortMode, encodeCommentCursor, COMMENT_SORT } from '../constants/comment.constants';

@Injectable()
export class CommentQueryService {
  private readonly logger = new Logger(CommentQueryService.name);

  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly reactionRepository: CommentReactionRepository,
  ) {}

  async listRootComments(
    postId: string,
    postType: CommentPostType,
    userId: string,
    options: {
      sort?: CommentSortMode;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<CommentListResponse> {
    const limit = Math.min(options.limit ?? COMMENT_DEFAULTS.DEFAULT_PAGE_SIZE, COMMENT_DEFAULTS.MAX_PAGE_SIZE);
    const sort = options.sort ?? COMMENT_SORT.BEST;

    const comments = await this.commentRepository.listRootComments(
      postId,
      postType,
      limit + 1,
      sort,
      options.cursor,
    );

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const lastItem = items[items.length - 1];

    const nextCursor = hasMore && lastItem
      ? encodeCommentCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
      : null;

    const enriched = await this.enrichWithViewerState(items, userId);

    return { items: enriched, nextCursor };
  }

  async listReplies(
    parentCommentId: string,
    userId: string,
    options: {
      sort?: CommentSortMode;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<CommentListResponse> {
    const limit = Math.min(options.limit ?? COMMENT_DEFAULTS.DEFAULT_PAGE_SIZE, COMMENT_DEFAULTS.MAX_PAGE_SIZE);
    const sort = options.sort ?? COMMENT_SORT.BEST;

    const replies = await this.commentRepository.listReplies(
      parentCommentId,
      limit + 1,
      sort,
      options.cursor,
    );

    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, limit) : replies;
    const lastItem = items[items.length - 1];

    const nextCursor = hasMore && lastItem
      ? encodeCommentCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
      : null;

    const enriched = await this.enrichWithViewerState(items, userId);

    return { items: enriched, nextCursor };
  }

  async getComment(
    commentId: string,
    userId: string,
  ): Promise<CommentResponseData> {
    const comment = await this.commentRepository.findByIdWithAuthor(commentId);

    if (!comment) {
      throw new CommentNotFoundException(commentId);
    }

    const [viewerVote] = await Promise.all([
      this.reactionRepository.findByCommentAndUser(commentId, userId),
    ]);

    return CommentMapper.toResponse(comment, {
      viewerVote,
      viewerCanEdit: comment.authorId === userId,
      viewerCanDelete: comment.authorId === userId,
      viewerCanModerate: false, // determined by calling domain
    });
  }

  private async enrichWithViewerState(
    comments: { id: string; authorId: string }[],
    userId: string,
  ): Promise<CommentResponseData[]> {
    const commentIds = comments.map((c) => c.id);

    const viewerVotes = await this.reactionRepository.findByCommentAndUser
      ? await Promise.all(
          commentIds.map((id) =>
            this.reactionRepository.findByCommentAndUser(id, userId),
          ),
        )
      : commentIds.map(() => null);

    return comments.map((comment, index) => {
      const fullComment = comment as any;
      return CommentMapper.toResponse(fullComment, {
        viewerVote: viewerVotes[index],
        viewerCanEdit: fullComment.authorId === userId,
        viewerCanDelete: fullComment.authorId === userId,
        viewerCanModerate: false,
      });
    });
  }
}
