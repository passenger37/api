import {
  Comment,
  CommentReaction,
  CommentReport,
  User,
  VoteType,
  CommentPostType,
  CommentStatus,
} from '@prisma/client';

export type CommentWithAuthor = Comment & {
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerified'>;
};

export type CommentWithReplies = CommentWithAuthor & {
  replies?: CommentWithAuthor[];
};

export type CommentWithViewerState = CommentWithAuthor & {
  viewerVote: VoteType | null;
  viewerCanEdit: boolean;
  viewerCanDelete: boolean;
  viewerCanModerate: boolean;
};

export type CommentReactionWithUser = CommentReaction & {
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
};

export interface CommentAuthorDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface CommentViewerState {
  viewerVote: VoteType | null;
  viewerCanEdit: boolean;
  viewerCanDelete: boolean;
  viewerCanModerate: boolean;
}

export interface CommentResponseData {
  id: string;
  postId: string;
  postType: CommentPostType;
  parentCommentId: string | null;
  content: string;
  status: CommentStatus;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  replyCount: number;
  version: number;
  author: CommentAuthorDto;
  viewer: CommentViewerState;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export interface CommentListResponse {
  items: CommentResponseData[];
  nextCursor: string | null;
}
