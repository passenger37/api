import { Post, PostReaction, PostSave, PostReport, User, PostMedia, PostHashtag, PostMention } from '@prisma/client';
import { ReactionType } from '@prisma/client';

import { PostDetailResponse, PostListResponse, ViewerStateDto, ReactionCountsDto, PostAuthorDto, PostMediaDto, PostHashtagDto, PostMentionDto, ReactionDto, BookmarkDto } from '../dto/response/post.response';

import { PostDetailViewData, PostListViewData } from '../types/post-response.types';

const EMPTY_REACTION_COUNTS: ReactionCountsDto = {
  LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0, FIRE: 0, CELEBRATE: 0,
  total: 0,
};

export class PostMapper {
  static toAuthorDto(user: User & { isVerified?: boolean }): PostAuthorDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      isVerified: user.isVerified ?? false,
    };
  }

  static toMediaDto(media: PostMedia): PostMediaDto {
    return {
      id: media.id,
      postId: media.postId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl ?? undefined,
      width: media.width ?? undefined,
      height: media.height ?? undefined,
      duration: media.duration ?? undefined,
      mimeType: media.mimeType,
      order: media.order,
    };
  }

  static toHashtagDto(hashtag: PostHashtag): PostHashtagDto {
    return {
      id: hashtag.id,
      tag: hashtag.tag,
    };
  }

  static toMentionDto(mention: PostMention & { mentionedUser?: User }): PostMentionDto {
    return {
      id: mention.id,
      mentionedUserId: mention.mentionedUserId,
      position: mention.position,
      length: mention.length,
      mentionedUser: mention.mentionedUser ? this.toAuthorDto(mention.mentionedUser) : { id: mention.mentionedUserId, username: '', displayName: '', isVerified: false },
    };
  }

  static toReactionCounts(reactions: Record<ReactionType, number>): ReactionCountsDto {
    const types: ReactionType[] = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'FIRE', 'CELEBRATE'];
    const result: ReactionCountsDto = {
      LIKE: 0,
      LOVE: 0,
      HAHA: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
      FIRE: 0,
      CELEBRATE: 0,
      total: 0,
    };

    for (const type of types) {
      result[type] = reactions[type] ?? 0;
      result.total += result[type];
    }

    return result;
  }

  static toDetailResponse(post: any, viewData: PostDetailViewData): PostDetailResponse {
    return {
      id: post.id,
      authorId: post.authorId,
      type: post.type as any,
      content: post.content ?? undefined,
      contentType: post.contentType,
      visibility: post.visibility,
      status: post.status,
      reactionCount: post.reactionCount,
      commentCount: post.commentCount,
      repostCount: post.repostCount,
      viewCount: post.viewCount,
      originalPostId: post.originalPostId ?? undefined,
      quotedPostId: post.quotedPostId ?? undefined,
      contentWarning: post.contentWarning ?? undefined,
      isSensitive: post.isSensitive,
      language: post.language ?? undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      editedAt: post.editedAt ?? undefined,
      deletedAt: post.deletedAt ?? undefined,
      author: this.toAuthorDto(post.User),
      originalPost: post.originalPost ? {
        id: post.originalPost.id,
        authorId: post.originalPost.authorId,
        type: post.originalPost.type as any,
        content: post.originalPost.content ?? undefined,
        contentType: post.originalPost.contentType,
        visibility: post.originalPost.visibility,
        status: post.originalPost.status,
        reactionCount: post.originalPost.reactionCount,
        reactionCounts: EMPTY_REACTION_COUNTS,
        commentCount: post.originalPost.commentCount,
        repostCount: post.originalPost.repostCount,
        viewCount: post.originalPost.viewCount,
        isSensitive: post.originalPost.isSensitive,
        createdAt: post.originalPost.createdAt,
        updatedAt: post.originalPost.updatedAt,
        author: this.toAuthorDto(post.originalPost.User),
        media: [],
        hashtags: [],
        mentions: [],
        viewer: { isBookmarked: false, canEdit: false, canDelete: false },
      } : undefined,
      quotedPost: post.quotedPost ? {
        id: post.quotedPost.id,
        authorId: post.quotedPost.authorId,
        type: post.quotedPost.type as any,
        content: post.quotedPost.content ?? undefined,
        contentType: post.quotedPost.contentType,
        visibility: post.quotedPost.visibility,
        status: post.quotedPost.status,
        reactionCount: post.quotedPost.reactionCount,
        reactionCounts: EMPTY_REACTION_COUNTS,
        commentCount: post.quotedPost.commentCount,
        repostCount: post.quotedPost.repostCount,
        viewCount: post.quotedPost.viewCount,
        isSensitive: post.quotedPost.isSensitive,
        createdAt: post.quotedPost.createdAt,
        updatedAt: post.quotedPost.updatedAt,
        author: this.toAuthorDto(post.quotedPost.User),
        media: [],
        hashtags: [],
        mentions: [],
        viewer: { isBookmarked: false, canEdit: false, canDelete: false },
      } : undefined,
      media: post.media?.map(this.toMediaDto) ?? [],
      hashtags: post.hashtags?.map(this.toHashtagDto) ?? [],
      mentions: post.mentions?.map(this.toMentionDto) ?? [],
      reactionCounts: viewData.reactionCounts,
      viewer: viewData,
    };
  }

  static toListResponse(post: any, viewData: PostListViewData): PostListResponse {
    return {
      id: post.id,
      authorId: post.authorId,
      type: post.type as any,
      content: post.content ?? undefined,
      contentType: post.contentType,
      visibility: post.visibility,
      status: post.status,
      reactionCount: post.reactionCount,
      commentCount: post.commentCount,
      repostCount: post.repostCount,
      viewCount: post.viewCount,
      originalPostId: post.originalPostId ?? undefined,
      quotedPostId: post.quotedPostId ?? undefined,
      isSensitive: post.isSensitive,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      editedAt: post.editedAt ?? undefined,
      author: this.toAuthorDto(post.User),
      originalPost: post.originalPost ? {
        id: post.originalPost.id,
        authorId: post.originalPost.authorId,
        type: post.originalPost.type as any,
        content: post.originalPost.content ?? undefined,
        contentType: post.originalPost.contentType,
        visibility: post.originalPost.visibility,
        status: post.originalPost.status,
        reactionCount: post.originalPost.reactionCount,
        commentCount: post.originalPost.commentCount,
        repostCount: post.originalPost.repostCount,
        viewCount: post.originalPost.viewCount,
        isSensitive: post.originalPost.isSensitive,
        createdAt: post.originalPost.createdAt,
        updatedAt: post.originalPost.updatedAt,
        author: this.toAuthorDto(post.originalPost.User),
        media: [],
        hashtags: [],
        mentions: [],
        viewer: { isBookmarked: false, canEdit: false, canDelete: false },
      } : undefined,
      quotedPost: post.quotedPost ? {
        id: post.quotedPost.id,
        authorId: post.quotedPost.authorId,
        type: post.quotedPost.type as any,
        content: post.quotedPost.content ?? undefined,
        contentType: post.quotedPost.contentType,
        visibility: post.quotedPost.visibility,
        status: post.quotedPost.status,
        reactionCount: post.quotedPost.reactionCount,
        commentCount: post.quotedPost.commentCount,
        repostCount: post.quotedPost.repostCount,
        viewCount: post.quotedPost.viewCount,
        isSensitive: post.quotedPost.isSensitive,
        createdAt: post.quotedPost.createdAt,
        updatedAt: post.quotedPost.updatedAt,
        author: this.toAuthorDto(post.quotedPost.User),
        media: [],
        hashtags: [],
mentions: [],
        viewer: { isBookmarked: false, canEdit: false, canDelete: false },
      } : undefined,
      media: post.media?.map(this.toMediaDto) ?? [],
      hashtags: post.hashtags?.map(this.toHashtagDto) ?? [],
      mentions: post.mentions?.map(this.toMentionDto) ?? [],
      viewer: viewData,
    };
  }

  static toReactionDto(reaction: PostReaction & { user?: User }): ReactionDto {
    return {
      id: reaction.id,
      postId: reaction.postId,
      userId: reaction.userId,
      type: reaction.type,
      createdAt: reaction.createdAt,
      user: reaction.user ? this.toAuthorDto(reaction.user) : { id: reaction.userId, username: '', displayName: '', isVerified: false },
    };
  }

  static toBookmarkDto(bookmark: PostSave & { post?: any }): BookmarkDto {
    return {
      id: bookmark.id,
      postId: bookmark.postId,
      userId: bookmark.userId,
      createdAt: bookmark.createdAt,
      post: bookmark.post ? {
        ...bookmark.post,
        hashtags: bookmark.post.hashtags?.map(this.toHashtagDto) ?? [],
        mentions: bookmark.post.mentions?.map(this.toMentionDto) ?? [],
        viewer: {
          viewerReaction: null,
          isBookmarked: true,
          reactionCounts: EMPTY_REACTION_COUNTS,
          canEdit: false,
          canDelete: false,
        },
      } : { id: '', authorId: '', type: 'POST', contentType: 'TEXT', visibility: 'PUBLIC', status: 'ACTIVE', reactionCount: 0, commentCount: 0, repostCount: 0, viewCount: 0, isSensitive: false, createdAt: new Date(), updatedAt: new Date(), author: { id: '', username: '', displayName: '', isVerified: false }, media: [], hashtags: [], mentions: [], viewer: { isBookmarked: false, canEdit: false, canDelete: false } },
    };
  }
}