import {
  Community,
  CommunityCategory,
  CommunityComment,
  CommunityModerator,
  CommunityModerationAction,
  CommunityPost,
  CommunitySubscription,
  CommunityPostVote,
  CommunityPostMedia,
  CommunityPostHashtag,
  CommunityPostMention,
  CommunityPostReport,
  CommunityPostBookmark,
  CommunityPostEditHistory,
} from '@prisma/client';

export type CommunityWithCounts = Community & {
  _count?: {
    posts?: number;
    subscriptions?: number;
  };
};

export type CommunityModeratedWithRelations = CommunityModerator & {
  community: Community;
};

export type CommunitySubscriptionWithCommunity = CommunitySubscription & {
  community: Community;
};

export type CommunityPostWithRelations = CommunityPost & {
  category?: CommunityCategory | null;
  comments?: CommunityComment[];
  _count?: {
    comments?: number;
  };
};

export type CommunityPostWithFullRelations = CommunityPost & {
  category?: CommunityCategory | null;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  originalPost?:
    | (CommunityPost & {
        author?: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
      })
    | null;
  quotedPost?:
    | (CommunityPost & {
        author?: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
      })
    | null;
  media?: CommunityPostMedia[];
  hashtags?: CommunityPostHashtag[];
  mentions?: CommunityPostMention[];
  votes?: CommunityPostVote[];
  reports?: CommunityPostReport[];
  bookmarks?: CommunityPostBookmark[];
  _count?: {
    comments?: number;
    votes?: number;
  };
};

export type CommunityCommentWithRelations = CommunityComment & {
  replies?: CommunityComment[];
};

export type CommunityModerationHistoryRow = CommunityModerationAction;

export type CommunityPostVoteWithUser = CommunityPostVote & {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type CommunityPostMediaWithMedia = CommunityPostMedia & {
  media: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
    width: number | null;
    height: number | null;
    duration: number | null;
  };
};

export type CommunityPostReportWithReporter = CommunityPostReport & {
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  handledBy?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type CommunityPostBookmarkWithPost = CommunityPostBookmark & {
  post: CommunityPostWithRelations;
};

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export type CommunityPostVisibility = 'COMMUNITY_MEMBERS' | 'PUBLIC';
export type CommunityPostContentType =
  | 'TEXT'
  | 'MEDIA'
  | 'MIXED'
  | 'LINK'
  | 'POLL';
export type CommunityPostStatus =
  | 'ACTIVE'
  | 'HIDDEN'
  | 'LOCKED'
  | 'MODERATION_PENDING'
  | 'DELETED';

export interface VoteCounts {
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface ViewerPostState {
  vote: VoteType | null;
  isBookmarked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
}
