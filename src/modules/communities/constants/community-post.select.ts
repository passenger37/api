import { Prisma } from '@prisma/client';

export const COMMUNITY_POST_LIST_SELECT = {
  id: true,
  communityId: true,
  categoryId: true,
  authorUserId: true,
  title: true,
  content: true,
  contentType: true,
  visibility: true,
  status: true,
  isPinned: true,
  pinnedAt: true,
  isDeleted: true,
  deletedAt: true,
  contentWarning: true,
  isSensitive: true,
  language: true,
  version: true,
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  bookmarkCount: true,
  repostCount: true,
  viewCount: true,
  originalPostId: true,
  quotedPostId: true,
  lockedAt: true,
  lockedReason: true,
  hiddenAt: true,
  hiddenReason: true,
  moderatedAt: true,
  moderatedByUserId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      description: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      communityId: true,
    },
  },
  originalPost: {
    select: {
      id: true,
      title: true,
      content: true,
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  quotedPost: {
    select: {
      id: true,
      title: true,
      content: true,
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  media: {
    select: {
      id: true,
      postId: true,
      mediaId: true,
      type: true,
      url: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      duration: true,
      mimeType: true,
      sortOrder: true,
      altText: true,
      focalPointX: true,
      focalPointY: true,
      userId: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.CommunityPostSelect;

export const COMMUNITY_POST_DETAIL_SELECT = {
  ...COMMUNITY_POST_LIST_SELECT,
  content: true,
  contentWarning: true,
  language: true,
  lockedAt: true,
  lockedReason: true,
  hiddenAt: true,
  hiddenReason: true,
  moderatedAt: true,
  moderatedByUserId: true,
  hashtags: {
    select: {
      id: true,
      tag: true,
    },
  },
  mentions: {
    select: {
      id: true,
      mentionedUserId: true,
      position: true,
      length: true,
      mentionedUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  _count: {
    select: {
      votes: true,
      media: true,
      hashtags: true,
      mentions: true,
      reports: true,
      bookmarks: true,
      editHistory: true,
    },
  },
} satisfies Prisma.CommunityPostSelect;

export const COMMUNITY_POST_AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

export const COMMUNITY_POST_MEDIA_SELECT = {
  id: true,
  postId: true,
  mediaId: true,
  type: true,
  url: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  duration: true,
  mimeType: true,
  sortOrder: true,
  altText: true,
  focalPointX: true,
  focalPointY: true,
  userId: true,
} satisfies Prisma.CommunityPostMediaSelect;

export const COMMUNITY_POST_VOTE_SELECT = {
  id: true,
  postId: true,
  userId: true,
  vote: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
} satisfies Prisma.CommunityPostVoteSelect;

export const COMMUNITY_POST_REPORT_SELECT = {
  id: true,
  postId: true,
  reporterUserId: true,
  reason: true,
  detailText: true,
  status: true,
  handledByUserId: true,
  handledAt: true,
  createdAt: true,
  reporter: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  handledBy: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
} satisfies Prisma.CommunityPostReportSelect;

export const COMMUNITY_POST_BOOKMARK_SELECT = {
  id: true,
  postId: true,
  userId: true,
  createdAt: true,
  post: {
    select: COMMUNITY_POST_LIST_SELECT,
  },
} satisfies Prisma.CommunityPostBookmarkSelect;