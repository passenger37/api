import { Comment, User } from '@prisma/client';

import {
  CommentResponseData,
  CommentAuthorDto,
  CommentViewerState,
  CommentWithAuthor,
} from '../types/comment.types';

export class CommentMapper {
  static toAuthorDto(
    user: Pick<
      User,
      'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerified'
    >,
  ): CommentAuthorDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      isVerified: user.isVerified,
    };
  }

  static toResponse(
    comment: CommentWithAuthor,
    viewerState: CommentViewerState,
  ): CommentResponseData {
    return {
      id: comment.id,
      postId: comment.postId,
      postType: comment.postType,
      parentCommentId: comment.parentCommentId,
      content:
        comment.status === 'DELETED' || comment.status === 'REMOVED'
          ? '[deleted]'
          : comment.content,
      status: comment.status,
      upvoteCount: comment.upvoteCount,
      downvoteCount: comment.downvoteCount,
      score: comment.upvoteCount - comment.downvoteCount,
      replyCount: comment.replyCount,
      version: comment.version,
      author:
        comment.status === 'DELETED' || comment.status === 'REMOVED'
          ? {
              id: '',
              username: '[deleted]',
              displayName: '[deleted]',
              isVerified: false,
            }
          : this.toAuthorDto(comment.author),
      viewer: viewerState,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      editedAt: comment.editedAt,
      deletedAt: comment.deletedAt,
    };
  }
}
