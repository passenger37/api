import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PostVisibility, PostStatus, Post, ReactionType } from '@prisma/client';

import { PostRepository } from '../repositories/post.repository';
import { PostReactionRepository } from '../repositories/post-reaction.repository';
import { PostBookmarkRepository } from '../repositories/post-bookmark.repository';
import { PostMediaRepository } from '../repositories/post-media.repository';
import { PostReportRepository } from '../repositories/post-report.repository';

import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import { MediaProcessingService } from '../../media/services/media-processing.service';

import { PostMapper } from '../mappers/post.mapper';
import {
  PostDetailResponse,
  PostListResponse,
  PostDetailViewData,
  PostListViewData,
} from '../dto/response';

import {
  encodePostCursor,
  decodePostCursor,
} from '../constants/post.constants';
import { POST_DEFAULTS } from '../constants/post.constants';

import type { Prisma } from '@prisma/client';

interface FeedOptions {
  viewerId: string;
  authorIds: string[];
  cursor?: string | null;
  limit?: number;
}

interface UserPostsOptions {
  viewerId: string;
  authorId: string;
  cursor?: string | null;
  limit?: number;
  visibility?: PostVisibility[];
}

interface PublicPostsOptions {
  viewerId: string;
  cursor?: string | null;
  limit?: number;
  authorId?: string;
  tag?: string;
}

@Injectable()
export class PostQueryService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly reactionRepository: PostReactionRepository,
    private readonly bookmarkRepository: PostBookmarkRepository,
    private readonly mediaRepository: PostMediaRepository,
    private readonly reportRepository: PostReportRepository,
    private readonly socialRepository: UserSocialRepository,
    private readonly mediaProcessing: MediaProcessingService,
  ) {}

  async getPostById(
    postId: string,
    viewerId: string,
  ): Promise<PostDetailResponse> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canViewPost(viewerId, post as any))) {
      throw new ForbiddenException('Cannot view this post');
    }

    return this.mapPostToDetail(post as any, viewerId);
  }

  async getUserPosts(
    authorId: string,
    options: UserPostsOptions,
  ): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const {
      viewerId,
      cursor,
      limit = POST_DEFAULTS.DEFAULT_LIMIT,
      visibility,
    } = options;

    const cursorObj = cursor ? decodePostCursor(cursor) : null;

    let allowedVisibilities = visibility;
    if (!allowedVisibilities) {
      allowedVisibilities = await this.getAllowedVisibilities(
        viewerId,
        authorId,
      );
    }

    const result = await this.postRepository.findUserPosts(authorId, viewerId, {
      cursor: cursorObj,
      limit: Math.min(limit, POST_DEFAULTS.MAX_LIMIT),
      visibility: allowedVisibilities,
    });

    const items = await Promise.all(
      result.items.map((post) => this.mapPostToDetail(post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getFeedPosts(options: FeedOptions): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const {
      viewerId,
      authorIds,
      cursor,
      limit = POST_DEFAULTS.DEFAULT_LIMIT,
    } = options;

    if (authorIds.length === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const cursorObj = cursor ? decodePostCursor(cursor) : null;

    const result = await this.postRepository.findFeedPosts(
      authorIds,
      viewerId,
      {
        cursor: cursorObj,
        limit: Math.min(limit, POST_DEFAULTS.MAX_LIMIT),
      },
    );

    const items = await Promise.all(
      result.items.map((post) => this.mapPostToDetail(post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getPublicPosts(options: PublicPostsOptions): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const {
      viewerId,
      cursor,
      limit = POST_DEFAULTS.DEFAULT_LIMIT,
      authorId,
      tag,
    } = options;

    const cursorObj = cursor ? decodePostCursor(cursor) : null;

    const result = await this.postRepository.findPublicPosts({
      cursor: cursorObj,
      limit: Math.min(limit, POST_DEFAULTS.MAX_LIMIT),
      authorId,
      tag,
    });

    const items = await Promise.all(
      result.items.map((post) => this.mapPostToDetail(post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getReposts(
    originalPostId: string,
    viewerId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const cursorObj = cursor ? decodePostCursor(cursor) : null;
    const effectiveLimit = Math.min(
      limit ?? POST_DEFAULTS.DEFAULT_LIMIT,
      POST_DEFAULTS.MAX_LIMIT,
    );

    const result = await this.postRepository.findReposts(originalPostId, {
      cursor: cursorObj,
      limit: effectiveLimit,
    });

    const items = await Promise.all(
      result.items.map((post) => this.mapPostToDetail(post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getQuotes(
    quotedPostId: string,
    viewerId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const cursorObj = cursor ? decodePostCursor(cursor) : null;
    const effectiveLimit = Math.min(
      limit ?? POST_DEFAULTS.DEFAULT_LIMIT,
      POST_DEFAULTS.MAX_LIMIT,
    );

    const result = await this.postRepository.findQuotes(quotedPostId, {
      cursor: cursorObj,
      limit: effectiveLimit,
    });

    const items = await Promise.all(
      result.items.map((post) => this.mapPostToDetail(post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getBookmarkedPosts(
    viewerId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<{
    items: PostListResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const cursorObj = cursor ? decodePostCursor(cursor) : null;
    const effectiveLimit = Math.min(
      limit ?? POST_DEFAULTS.DEFAULT_LIMIT,
      POST_DEFAULTS.MAX_LIMIT,
    );

    const result = await this.bookmarkRepository.findByUser(viewerId, {
      cursor: cursorObj,
      limit: effectiveLimit,
    });

    const items = await Promise.all(
      result.items
        .filter((b) => b.Post && this.canViewPostSync(viewerId, b.Post))
        .map((b) => this.mapPostToDetail(b.Post, viewerId)),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getPostReactions(
    postId: string,
    viewerId: string,
    cursor?: string | null,
    limit?: number,
    type?: string,
  ) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canViewPost(viewerId, post))) {
      throw new ForbiddenException('Cannot view this post');
    }

    const cursorObj = cursor ? decodePostCursor(cursor) : null;
    const effectiveLimit = Math.min(
      limit ?? POST_DEFAULTS.DEFAULT_LIMIT,
      POST_DEFAULTS.MAX_LIMIT,
    );
    const reactionType = type as ReactionType;

    const result = await this.reactionRepository.findByPost(postId, {
      cursor: cursorObj,
      limit: effectiveLimit,
      type: reactionType,
    });

    const items = result.items.map((reaction) =>
      PostMapper.toReactionDto(reaction),
    );

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  async getPostReportReports(
    postId: string,
    viewerId: string,
    cursor?: string | null,
    limit?: number,
  ) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const isAuthor = post.authorId === viewerId;

    if (!isAuthor) {
      throw new ForbiddenException('Cannot view reports for this post');
    }

    const cursorObj = cursor ? decodePostCursor(cursor) : null;
    const effectiveLimit = Math.min(
      limit ?? POST_DEFAULTS.DEFAULT_LIMIT,
      POST_DEFAULTS.MAX_LIMIT,
    );

    const result = await this.reportRepository.findByPost(postId, {
      cursor: cursorObj,
      limit: effectiveLimit,
    });

    const items = result.items.map((report: any) => ({
      ...report,
      reporter: PostMapper.toAuthorDto(report.reporter),
      handledBy: report.handledBy
        ? PostMapper.toAuthorDto(report.handledBy)
        : undefined,
    }));

    return {
      items,
      nextCursor: result.nextCursor
        ? encodePostCursor(result.nextCursor.createdAt, result.nextCursor.id)
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  private async getAllowedVisibilities(
    viewerId: string,
    authorId: string,
  ): Promise<PostVisibility[]> {
    if (viewerId === authorId) {
      return [
        PostVisibility.PUBLIC,
        PostVisibility.FOLLOWERS,
        PostVisibility.FRIENDS,
        PostVisibility.PRIVATE,
      ];
    }

    const isFollowing = await this.socialRepository.existsFollow(
      viewerId,
      authorId,
    );
    const isBlocked =
      (await this.socialRepository.existsBlock(authorId, viewerId)) ||
      (await this.socialRepository.existsBlock(viewerId, authorId));

    if (isBlocked) {
      return [];
    }

    const visibilities: PostVisibility[] = [PostVisibility.PUBLIC];
    if (isFollowing) {
      visibilities.push(PostVisibility.FOLLOWERS, PostVisibility.FRIENDS);
    }

    return visibilities;
  }

  private async canViewPost(viewerId: string, post: any): Promise<boolean> {
    if (post.authorId === viewerId) return true;
    if (post.isDeleted || post.status === PostStatus.DELETED) return false;
    if (post.status === PostStatus.HIDDEN) return false;

    if (post.visibility === PostVisibility.PUBLIC) return true;

    const isFollowing = await this.socialRepository.existsFollow(
      viewerId,
      post.authorId,
    );
    const isBlocked =
      (await this.socialRepository.existsBlock(post.authorId, viewerId)) ||
      (await this.socialRepository.existsBlock(viewerId, post.authorId));

    if (isBlocked) return false;

    if (
      post.visibility === PostVisibility.FOLLOWERS ||
      post.visibility === PostVisibility.FRIENDS
    ) {
      return isFollowing;
    }

    if (post.visibility === PostVisibility.PRIVATE) {
      return false;
    }

    return false;
  }

  private canViewPostSync(viewerId: string, post: any): boolean {
    if (post.authorId === viewerId) return true;
    if (post.isDeleted || post.status === PostStatus.DELETED) return false;
    if (post.status === PostStatus.HIDDEN) return false;
    if (post.visibility === PostVisibility.PUBLIC) return true;
    return false;
  }

  private async mapPostToDetail(
    post: Post,
    viewerId: string,
  ): Promise<PostDetailResponse> {
    const [viewerReaction, isBookmarked, reactionCounts] = await Promise.all([
      this.reactionRepository.getViewerReaction(post.id, viewerId),
      this.bookmarkRepository.exists(post.id, viewerId),
      this.reactionRepository.getReactionCounts(post.id),
    ]);

    const viewData: PostDetailViewData = {
      viewerReaction,
      isBookmarked,
      reactionCounts,
      canEdit: post.authorId === viewerId,
      canDelete: post.authorId === viewerId,
    };

    return PostMapper.toDetailResponse(post as any, viewData);
  }
}
