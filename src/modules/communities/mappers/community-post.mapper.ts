import {
  CommunityPost,
  CommunityPostMedia,
  CommunityPostHashtag,
  CommunityPostMention,
  CommunityPostReport,
  CommunityPostBookmark,
  User,
} from '@prisma/client';

import {
  CommunityPostDetailResponse,
  CommunityPostListResponse,
  CommunityPostMediaResponse,
  CommunityPostHashtagResponse,
  CommunityPostMentionResponse,
  CommunityPostVoteResponse,
  CommunityPostReportResponse,
  CommunityPostBookmarkResponse,
  CommunityPostViewerState,
  CommunityPostListViewerState,
  CommunityPostWithRelations,
  CommunityPostVoteWithUser,
  CommunityPostReportWithRelations,
  CommunityPostAuthor,
  VoteCounts,
} from '../types/community-post.types';

export class CommunityPostMapper {
  static toAuthorDto(user: CommunityPostAuthor): {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  } {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      isVerified: Boolean(user.isVerified),
    };
  }

  static toMediaDto(media: CommunityPostMedia): CommunityPostMediaResponse {
    return {
      id: media.id,
      postId: media.postId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl ?? null,
      width: media.width ?? null,
      height: media.height ?? null,
      duration: media.duration ?? null,
      mimeType: media.mimeType,
      sortOrder: media.sortOrder,
      altText: media.altText,
      focalPointX: media.focalPointX,
      focalPointY: media.focalPointY,
    };
  }

  static toHashtagDto(
    hashtag: CommunityPostHashtag,
  ): CommunityPostHashtagResponse {
    return {
      id: hashtag.id,
      tag: hashtag.tag,
    };
  }

  static toMentionDto(
    mention: CommunityPostMention & { mentionedUser?: CommunityPostAuthor },
  ): CommunityPostMentionResponse {
    return {
      id: mention.id,
      mentionedUserId: mention.mentionedUserId,
      position: mention.position,
      length: mention.length,
      mentionedUser: mention.mentionedUser
        ? this.toAuthorDto(mention.mentionedUser)
        : {
            id: mention.mentionedUserId,
            username: '',
            displayName: '',
            avatarUrl: null,
            isVerified: false,
          },
    };
  }

  static toVoteCounts(upvotes: number, downvotes: number): VoteCounts {
    return {
      UPVOTE: upvotes ?? 0,
      DOWNVOTE: downvotes ?? 0,
      total: (upvotes ?? 0) + (downvotes ?? 0),
    };
  }

  static toDetailResponse(
    post: CommunityPostWithRelations,
    viewer: CommunityPostViewerState,
  ): CommunityPostDetailResponse {
    return {
      id: post.id,
      communityId: post.communityId,
      categoryId: post.categoryId,
      authorUserId: post.authorUserId,
      title: post.title,
      content: post.content,
      contentType: post.contentType,
      visibility: post.visibility,
      status: post.status,
      isPinned: post.isPinned,
      pinnedAt: post.pinnedAt,
      isDeleted: post.isDeleted,
      deletedAt: post.deletedAt,
      contentWarning: post.contentWarning,
      isSensitive: post.isSensitive,
      language: post.language,
      version: post.version,
      upvoteCount: post.upvoteCount,
      downvoteCount: post.downvoteCount,
      commentCount: post.commentCount,
      bookmarkCount: post.bookmarkCount,
      repostCount: post.repostCount,
      viewCount: post.viewCount,
      originalPostId: post.originalPostId,
      quotedPostId: post.quotedPostId,
      lockedAt: post.lockedAt,
      lockedReason: post.lockedReason,
      hiddenAt: post.hiddenAt,
      hiddenReason: post.hiddenReason,
      moderatedAt: post.moderatedAt,
      moderatedByUserId: post.moderatedByUserId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      editedAt: post.editedAt ?? null,
      author: post.author
        ? this.toAuthorDto(post.author)
        : {
            id: post.authorUserId,
            username: '',
            displayName: '',
            avatarUrl: null,
            isVerified: false,
          },
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            description: post.category.description,
            position: post.category.position,
          }
        : null,
      originalPost: post.originalPost
        ? this.toReferencedPost(post.originalPost)
        : null,
      quotedPost: post.quotedPost
        ? this.toReferencedPost(post.quotedPost)
        : null,
      media: (post.media ?? []).map((m) => this.toMediaDto(m)),
      hashtags: (post.hashtags ?? []).map((h) => this.toHashtagDto(h)),
      mentions: (post.mentions ?? []).map((m) => this.toMentionDto(m)),
      voteCounts: this.toVoteCounts(post.upvoteCount, post.downvoteCount),
      viewer,
    };
  }

  static toListResponse(
    post: CommunityPostWithRelations,
    viewer: CommunityPostListViewerState,
  ): CommunityPostListResponse {
    return {
      id: post.id,
      communityId: post.communityId,
      categoryId: post.categoryId,
      authorUserId: post.authorUserId,
      title: post.title,
      content: post.content,
      contentType: post.contentType,
      visibility: post.visibility,
      status: post.status,
      isPinned: post.isPinned,
      isDeleted: post.isDeleted,
      upvoteCount: post.upvoteCount,
      downvoteCount: post.downvoteCount,
      commentCount: post.commentCount,
      bookmarkCount: post.bookmarkCount,
      repostCount: post.repostCount,
      viewCount: post.viewCount,
      originalPostId: post.originalPostId,
      quotedPostId: post.quotedPostId,
      isSensitive: post.isSensitive,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      editedAt: post.editedAt ?? null,
      author: post.author
        ? this.toAuthorDto(post.author)
        : {
            id: post.authorUserId,
            username: '',
            displayName: '',
            avatarUrl: null,
            isVerified: false,
          },
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            description: post.category.description,
            position: post.category.position,
          }
        : null,
      originalPost: post.originalPost
        ? this.toReferencedPost(post.originalPost)
        : null,
      quotedPost: post.quotedPost
        ? this.toReferencedPost(post.quotedPost)
        : null,
      media: (post.media ?? []).map((m) => this.toMediaDto(m)),
      viewer,
    };
  }

  private static toReferencedPost(
    ref: CommunityPost & { author?: User | null },
  ): {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  } {
    return {
      id: ref.id,
      title: ref.title,
      content: ref.content ?? null,
      author: ref.author
        ? {
            id: ref.author.id,
            username: ref.author.username,
            displayName: ref.author.displayName,
            avatarUrl: ref.author.avatarUrl ?? null,
          }
        : {
            id: ref.authorUserId,
            username: '',
            displayName: '',
            avatarUrl: null,
          },
    };
  }

  static toVoteResponse(
    vote: CommunityPostVoteWithUser,
  ): CommunityPostVoteResponse {
    return {
      id: vote.id,
      postId: vote.postId,
      userId: vote.userId,
      vote: vote.vote,
      createdAt: vote.createdAt,
      user: this.toAuthorDto(vote.user),
    };
  }

  static toReportResponse(
    report: CommunityPostReportWithRelations,
  ): CommunityPostReportResponse {
    return {
      id: report.id,
      postId: report.postId,
      reporterUserId: report.reporterUserId,
      reason: report.reason,
      detailText: report.detailText,
      status: report.status,
      handledByUserId: report.handledByUserId,
      handledAt: report.handledAt,
      createdAt: report.createdAt,
      reporter: this.toAuthorDto(report.reporter),
      handledBy: report.handledBy ? this.toAuthorDto(report.handledBy) : null,
    };
  }

  static toBookmarkResponse(
    bookmark: CommunityPostBookmark & {
      post: CommunityPostWithRelations;
    },
  ): CommunityPostBookmarkResponse {
    return {
      id: bookmark.id,
      postId: bookmark.postId,
      userId: bookmark.userId,
      createdAt: bookmark.createdAt,
      post: this.toListResponse(bookmark.post, {
        vote: null,
        isBookmarked: false,
        canEdit: false,
        canDelete: false,
      }),
    };
  }
}
