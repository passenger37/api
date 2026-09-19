import {
  CommunityPost,
  CommunityPostVote,
  CommunityPostMedia,
  CommunityPostHashtag,
  CommunityPostMention,
  CommunityPostReport,
  CommunityPostBookmark,
  CommunityPostEditHistory,
  CommunityComment,
  CommunityCategory,
  User,
  VoteType,
  CommunityPostVisibility,
  CommunityPostContentType,
  CommunityPostStatus,
  PostReportReason,
  ReportStatus,
} from '@prisma/client';

export type CommunityPostWithRelations = CommunityPost & {
  category?: CommunityCategory | null;
  author?: User | null;
  originalPost?: (CommunityPost & { author?: User | null }) | null;
  quotedPost?: (CommunityPost & { author?: User | null }) | null;
  quotes?: CommunityPost[];
  comments?: CommunityComment[];
  votes?: CommunityPostVote[];
  media?: CommunityPostMedia[];
  hashtags?: CommunityPostHashtag[];
  mentions?: CommunityPostMention[];
  reports?: CommunityPostReport[];
  bookmarks?: CommunityPostBookmark[];
  editHistory?: CommunityPostEditHistory[];
  moderatedBy?: User | null;
  _count?: {
    votes?: number;
    media?: number;
    hashtags?: number;
    mentions?: number;
    reports?: number;
    bookmarks?: number;
    editHistory?: number;
    comments?: number;
  };
};

export type CommunityPostAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
};

export type CommunityPostVoteWithUser = CommunityPostVote & {
  user: CommunityPostAuthor;
};

export type CommunityPostMediaWithDetails = CommunityPostMedia;

export type CommunityPostReportWithRelations = CommunityPostReport & {
  reporter: CommunityPostAuthor;
  handledBy: CommunityPostAuthor | null;
};

export type CommunityPostBookmarkWithPost = CommunityPostBookmark & {
  post: CommunityPostWithRelations;
};

export interface CommunityPostDetailViewData {
  viewerVote?: VoteType | null;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canPin: boolean;
  canLock: boolean;
  canHide: boolean;
  canReport: boolean;
}

export interface CommunityPostListViewData {
  viewerVote?: VoteType | null;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canPin: boolean;
  canLock: boolean;
  canHide: boolean;
}

export interface CreateCommunityPostInput {
  authorId: string;
  communityId: string;
  title: string;
  content: string;
  contentType?: CommunityPostContentType;
  visibility?: CommunityPostVisibility;
  categoryId?: string;
  mediaIds?: string[];
  contentWarning?: string;
  isSensitive?: boolean;
  language?: string;
  scheduledAt?: Date;
}

export interface UpdateCommunityPostInput {
  title?: string;
  content?: string;
  visibility?: CommunityPostVisibility;
  contentWarning?: string | null;
  isSensitive?: boolean;
  language?: string | null;
  categoryId?: string | null;
  hashtags?: string[];
  mentions?: CommunityPostMentionInput[];
  media?: CommunityPostMediaInput[];
}

export interface CommunityPostVoteInput {
  vote: VoteType;
}

export interface CommunityPostMentionInput {
  mentionedUserId: string;
  position: number;
  length: number;
}

export interface CommunityPostMediaInput {
  mediaId?: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  mimeType: string;
  sortOrder?: number;
  altText?: string | null;
  focalPointX?: number | null;
  focalPointY?: number | null;
  userId?: string | null;
}

export interface CommunityPostReportInput {
  reason: PostReportReason;
  detailText?: string;
}

export interface CommunityPostReportResolveInput {
  status: 'RESOLVED' | 'DISMISSED';
  resolutionNote?: string;
}

export interface CommunityPostModerationInput {
  action: 'LOCK' | 'UNLOCK' | 'HIDE' | 'UNHIDE' | 'PIN' | 'UNPIN';
  reason?: string;
}

export type FeedSort = 'LATEST' | 'TOP' | 'HOT' | 'CONTROVERSIAL';
export type PostReportStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'RESOLVED'
  | 'DISMISSED';

export interface CommunityPostListQuery {
  cursor?: string | null;
  limit?: number;
  categoryId?: string;
  visibility?: CommunityPostVisibility;
  status?: CommunityPostStatus;
  authorId?: string;
  sort?: FeedSort;
}

export interface CommunityPostFeedQuery {
  communityId: string;
  viewerId: string;
  cursor?: string | null;
  limit?: number;
  sort?: FeedSort;
  categoryId?: string;
}

export interface PostCursor {
  createdAt: Date;
  id: string;
  isPinned: boolean;
}

export interface VoteCounts {
  UPVOTE: number;
  DOWNVOTE: number;
  total: number;
}

export interface CommunityPostDetailResponse {
  id: string;
  communityId: string;
  categoryId: string | null;
  authorUserId: string;
  title: string;
  content: string;
  contentType: string;
  visibility: string;
  status: string;
  isPinned: boolean;
  pinnedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  contentWarning: string | null;
  isSensitive: boolean;
  language: string | null;
  version: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  bookmarkCount: number;
  repostCount: number;
  viewCount: number;
  originalPostId: string | null;
  quotedPostId: string | null;
  lockedAt: Date | null;
  lockedReason: string | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
  moderatedAt: Date | null;
  moderatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  category: {
    id: string;
    name: string;
    description: string | null;
    position: number;
  } | null;
  originalPost: {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  } | null;
  quotedPost: {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  } | null;
  media: CommunityPostMediaResponse[];
  hashtags: CommunityPostHashtagResponse[];
  mentions: CommunityPostMentionResponse[];
  voteCounts: VoteCounts;
  viewer: CommunityPostViewerState;
}

export interface CommunityPostListResponse {
  id: string;
  communityId: string;
  categoryId: string | null;
  authorUserId: string;
  title: string;
  content: string;
  contentType: string;
  visibility: string;
  status: string;
  isPinned: boolean;
  isDeleted: boolean;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  bookmarkCount: number;
  repostCount: number;
  viewCount: number;
  originalPostId: string | null;
  quotedPostId: string | null;
  isSensitive: boolean;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  category: {
    id: string;
    name: string;
    description: string | null;
    position: number;
  } | null;
  originalPost: {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  } | null;
  quotedPost: {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  } | null;
  media: CommunityPostMediaResponse[];
  viewer: CommunityPostListViewerState;
}

export interface CommunityPostViewerState {
  vote: 'UPVOTE' | 'DOWNVOTE' | null;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CommunityPostListViewerState {
  vote: 'UPVOTE' | 'DOWNVOTE' | null;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CommunityPostMediaResponse {
  id: string;
  postId: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  mimeType: string;
  sortOrder: number;
  altText: string | null;
  focalPointX: number | null;
  focalPointY: number | null;
}

export interface CommunityPostHashtagResponse {
  id: string;
  tag: string;
}

export interface CommunityPostMentionResponse {
  id: string;
  mentionedUserId: string;
  position: number;
  length: number;
  mentionedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export interface CommunityPostVoteResponse {
  id: string;
  postId: string;
  userId: string;
  vote: 'UPVOTE' | 'DOWNVOTE';
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export interface CommunityPostReportResponse {
  id: string;
  postId: string;
  reporterUserId: string;
  reason: string;
  detailText: string | null;
  status: string;
  handledByUserId: string | null;
  handledAt: Date | null;
  createdAt: Date;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  handledBy?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
}

export interface CommunityPostBookmarkResponse {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
  post: CommunityPostListResponse;
}

export interface PaginatedCommunityPostsResponse {
  items: CommunityPostListResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedVotesResponse {
  items: CommunityPostVoteResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedReportsResponse {
  items: CommunityPostReportResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedBookmarksResponse {
  items: CommunityPostBookmarkResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface VoteBreakdownResponse {
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface CommunityPostEditHistoryResponse {
  id: string;
  postId: string;
  previousContent: string;
  editedByUserId: string;
  editedAt: Date;
}

export interface CommunityPostModerationResult {
  postId: string;
  action: 'LOCK' | 'UNLOCK' | 'HIDE' | 'UNHIDE' | 'PIN' | 'UNPIN';
  reason?: string;
  postStatus: string;
  isPinned: boolean;
}
