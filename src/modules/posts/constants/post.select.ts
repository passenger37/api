import { Prisma } from '@prisma/client';

export const POST_LIST_SELECT = {
  id: true,
  authorId: true,
  type: true,
  content: true,
  contentType: true,
  visibility: true,
  status: true,
  isDeleted: true,
  reactionCount: true,
  commentCount: true,
  repostCount: true,
  viewCount: true,
  isSensitive: true,
  originalPostId: true,
  quotedPostId: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  User: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
  },
  originalPost: {
    select: {
      id: true,
      content: true,
      User: {
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
      content: true,
      User: {
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
      type: true,
      url: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      duration: true,
      mimeType: true,
      order: true,
    },
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.PostSelect;

export const POST_DETAIL_SELECT = {
  ...POST_LIST_SELECT,
  contentWarning: true,
  language: true,
  hiddenAt: true,
  hiddenReason: true,
  scheduledAt: true,
  deletedAt: true,
  version: true,
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
      reactions: true,
      PostSave: true,
      PostShare: true,
      PostComment: true,
    },
  },
} satisfies Prisma.PostSelect;

export const POST_AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

export const POST_MEDIA_SELECT = {
  id: true,
  postId: true,
  type: true,
  url: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  duration: true,
  mimeType: true,
  order: true,
} satisfies Prisma.PostMediaSelect;

export const POST_REACTION_SELECT = {
  id: true,
  postId: true,
  userId: true,
  type: true,
  createdAt: true,
  user: {
    select: POST_AUTHOR_SELECT,
  },
} satisfies Prisma.PostReactionSelect;

export const POST_REPORT_SELECT = {
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
    select: POST_AUTHOR_SELECT,
  },
  handledBy: {
    select: POST_AUTHOR_SELECT,
  },
} satisfies Prisma.PostReportSelect;
