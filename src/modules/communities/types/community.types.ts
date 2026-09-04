import {
  Community,
  CommunityCategory,
  CommunityComment,
  CommunityModerator,
  CommunityModerationAction,
  CommunityPost,
  CommunitySubscription,
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

export type CommunityCommentWithRelations = CommunityComment & {
  replies?: CommunityComment[];
};

export type CommunityModerationHistoryRow = CommunityModerationAction;
