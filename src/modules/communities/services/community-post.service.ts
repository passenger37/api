import { Injectable } from '@nestjs/common';
import { CommunityPostContentType } from '@prisma/client';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityAccessDeniedException,
  CommunityCommentNotFoundException,
  CommunityInvalidCursorException,
  CommunityNotFoundException,
  CommunityPostDeletedException,
  CommunityPostNotFoundException,
  CommunityNotSubscribedException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityPostRepository } from '../repositories/community-post.repository';
import { CommunityCommentRepository } from '../repositories/community-comment.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunityPostMediaRepository } from '../repositories/community-post-media.repository';
import { CommunityPostHashtagRepository } from '../repositories/community-post-hashtag.repository';
import { CommunityPostMentionRepository } from '../repositories/community-post-mention.repository';
import {
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../dto/request';
import {
  CommentListResponse,
  PostListResponse,
  PostResponse,
  CommentResponse,
} from '../dto/response';
import {
  CommunityPostWithRelations,
  CommunityCommentWithRelations,
} from '../types/community.types';
import {
  decodePostCursor,
  encodePostCursor,
  decodeTwoFieldCursor,
  encodeTwoFieldCursor,
} from '../pagination/community-cursor';
import { serializePost, serializeComment } from '../mappers/community.mapper';
import { CommunityEventPublisher } from '../events/community-event-publisher';
import { COMMUNITY_REALTIME_EVENTS } from '../realtime/community-realtime.constants';
import { DbCacheService } from '../../../core/cache/db-cache.service';
import {
  COMMUNITY_FEED_CACHE,
  COMMUNITY_FEED_CACHE_LIMITS,
  COMMUNITY_FEED_SORTS_ALL,
  communityFeedCacheKey,
} from '../constants/community-post.constants';

@Injectable()
export class CommunityPostService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly postRepository: CommunityPostRepository,
    private readonly commentRepository: CommunityCommentRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly mediaRepository: CommunityPostMediaRepository,
    private readonly hashtagRepository: CommunityPostHashtagRepository,
    private readonly mentionRepository: CommunityPostMentionRepository,
    private readonly access: CommunityAccessService,
    private readonly eventPublisher: CommunityEventPublisher,
    private readonly dbCache: DbCacheService,
  ) {}

  async createPost(
    slug: string,
    userId: string,
    request: CreatePostRequest,
  ): Promise<PostResponse> {
    const community = await this.communityBySlug(slug);

    await this.requireSubscription(community.id, userId);

    if (request.categoryId) {
      const category = await this.categoryRepository.findById(
        request.categoryId,
      );

      if (!category || category.communityId !== community.id) {
        throw new CommunityAccessDeniedException(
          'The category does not belong to this community.',
        );
      }
    }

    const post = await this.postRepository.create({
      community: { connect: { id: community.id } },
      category: request.categoryId
        ? { connect: { id: request.categoryId } }
        : undefined,
      author: { connect: { id: userId } },
      title: request.title,
      content: request.content,
      contentType:
        request.contentType ??
        (request.media && request.media.length > 0
          ? request.content
            ? CommunityPostContentType.MIXED
            : CommunityPostContentType.MEDIA
          : CommunityPostContentType.TEXT),
    });

    if (request.media && request.media.length > 0) {
      await this.mediaRepository.createMany(
        post.id,
        request.media.map((item, index) => ({
          mediaId: item.mediaId,
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl ?? null,
          width: item.width ?? null,
          height: item.height ?? null,
          duration: item.duration ?? null,
          mimeType: item.mimeType,
          sortOrder: item.sortOrder ?? index,
          altText: item.altText ?? null,
          userId,
        })),
      );
    }

    if (request.hashtags && request.hashtags.length > 0) {
      await this.hashtagRepository.createMany(post.id, request.hashtags);
    }

    if (request.mentions && request.mentions.length > 0) {
      await this.mentionRepository.createMany(post.id, request.mentions);
    }

    const withRelations = (await this.postRepository.findById(post.id))!;

    const response = serializePost(withRelations);

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.POST_CREATED,
      {
        post: response,
      },
    );

    await this.invalidateFeed(community.id);

    return response;
  }

  async updatePost(
    slug: string,
    postId: string,
    userId: string,
    request: UpdatePostRequest,
  ): Promise<PostResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    const isModerator = await this.access.isModerator(community.id, userId);

    if (post.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    if (request.categoryId) {
      const category = await this.categoryRepository.findById(
        request.categoryId,
      );

      if (!category || category.communityId !== community.id) {
        throw new CommunityAccessDeniedException(
          'The category does not belong to this community.',
        );
      }
    }

    await this.postRepository.update(postId, {
      title: request.title,
      content: request.content,
      category: request.categoryId
        ? { connect: { id: request.categoryId } }
        : { disconnect: true },
      version: { increment: 1 },
    });

    const withRelations = (await this.postRepository.findById(postId))!;

    const response = serializePost(withRelations);

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.POST_UPDATED,
      {
        post: response,
      },
    );

    await this.invalidateFeed(community.id);

    return response;
  }

  async softDeletePost(
    slug: string,
    postId: string,
    userId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

    const isModerator = await this.access.isModerator(community.id, userId);

    if (post.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    await this.postRepository.softDelete(postId);

    await this.invalidateFeed(community.id);

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.POST_DELETED,
      {
        postId,
        communityId: community.id,
      },
    );
  }

  async listPosts(
    slug: string,
    userId: string,
    categoryId?: string,
    cursor?: string,
    limit = 20,
  ): Promise<PostListResponse> {
    const community = await this.communityBySlug(slug);

    await this.requireSubscription(community.id, userId);

    if (categoryId) {
      const category = await this.categoryRepository.findById(categoryId);

      if (!category || category.communityId !== community.id) {
        throw new CommunityAccessDeniedException(
          'The category does not belong to this community.',
        );
      }
    }

    const decoded = cursor ? this.decodePostCursor(cursor) : undefined;

    const rows = categoryId
      ? await this.postRepository.findPageByCategory(
          community.id,
          categoryId,
          limit,
          decoded,
        )
      : await this.postRepository.findPage(community.id, limit, decoded);

    const hasMore = rows.length > limit;
    const posts = hasMore ? rows.slice(0, limit) : rows;
    const last = posts[posts.length - 1];

    const nextCursor =
      hasMore && last
        ? encodePostCursor({
            isPinned: last.isPinned,
            createdAt: last.createdAt,
            id: last.id,
          })
        : null;

    return {
      items: posts.map(serializePost),
      nextCursor,
    };
  }

  async createComment(
    slug: string,
    postId: string,
    userId: string,
    request: CreateCommentRequest,
  ): Promise<CommentResponse> {
    const community = await this.communityBySlug(slug);

    await this.requireSubscription(community.id, userId);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    if (request.parentId) {
      const parent = await this.commentInPost(post.id, request.parentId);

      if (parent.isDeleted) {
        throw new CommunityCommentNotFoundException();
      }
    }

    const comment = await this.commentRepository.create({
      post: { connect: { id: post.id } },
      authorUserId: userId,
      content: request.content,
      parent: request.parentId
        ? { connect: { id: request.parentId } }
        : undefined,
    });

    const withRelations = (await this.commentRepository.findById(comment.id))!;

    const response = serializeComment({
      ...withRelations,
      replies: [],
    });

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.COMMENT_CREATED,
      {
        postId: post.id,
        comment: response,
      },
    );

    return response;
  }

  async replyToComment(
    slug: string,
    postId: string,
    commentId: string,
    userId: string,
    request: CreateCommentRequest,
  ): Promise<CommentResponse> {
    const community = await this.communityBySlug(slug);

    await this.requireSubscription(community.id, userId);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    const parent = await this.commentInPost(post.id, commentId);

    if (parent.isDeleted) {
      throw new CommunityCommentNotFoundException();
    }

    const comment = await this.commentRepository.create({
      post: { connect: { id: post.id } },
      authorUserId: userId,
      content: request.content,
      parent: { connect: { id: parent.id } },
    });

    const withRelations = (await this.commentRepository.findById(comment.id))!;

    const response = serializeComment({
      ...withRelations,
      replies: [],
    });

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.COMMENT_CREATED,
      {
        postId: post.id,
        comment: response,
        parentCommentId: parent.id,
      },
    );

    return response;
  }

  async updateComment(
    slug: string,
    commentId: string,
    userId: string,
    request: UpdateCommentRequest,
  ): Promise<CommentResponse> {
    const community = await this.communityBySlug(slug);

    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      throw new CommunityCommentNotFoundException();
    }

    const post = await this.postInCommunity(community.id, comment.postId);

    if (post.isDeleted) {
      throw new CommunityPostDeletedException();
    }

    const isModerator = await this.access.isModerator(community.id, userId);

    if (comment.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    await this.commentRepository.update(commentId, {
      content: request.content,
      version: { increment: 1 },
    });

    const withRelations = (await this.commentRepository.findById(commentId))!;

    const response = serializeComment({
      ...withRelations,
      replies: [],
    });

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.COMMENT_UPDATED,
      {
        postId: post.id,
        comment: response,
      },
    );

    return response;
  }

  async deleteComment(
    slug: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      throw new CommunityCommentNotFoundException();
    }

    const post = await this.postInCommunity(community.id, comment.postId);

    if (post.isDeleted && comment.authorUserId !== userId) {
      throw new CommunityPostDeletedException();
    }

    const isModerator = await this.access.isModerator(community.id, userId);

    if (comment.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    await this.commentRepository.softDelete(commentId);

    await this.eventPublisher.publish(
      community.id,
      COMMUNITY_REALTIME_EVENTS.COMMENT_DELETED,
      {
        postId: post.id,
        commentId,
        communityId: community.id,
      },
    );
  }

  async listComments(
    slug: string,
    postId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ): Promise<CommentListResponse> {
    const community = await this.communityBySlug(slug);

    await this.requireSubscription(community.id, userId);

    const post = await this.postInCommunity(community.id, postId);

    if (post.isDeleted) {
      return { items: [], nextCursor: null };
    }

    const decoded = cursor ? this.decodeTwoFieldCursorSafe(cursor) : undefined;

    const rows = await this.commentRepository.listPostComments(
      postId,
      limit + 1,
      decoded,
    );

    const hasMore = rows.length > limit;
    const comments = hasMore ? rows.slice(0, limit) : rows;
    const last = comments[comments.length - 1];

    return {
      items: comments.map(serializeComment),
      nextCursor:
        hasMore && last
          ? encodeTwoFieldCursor({
              createdAt: last.createdAt,
              id: last.id,
            })
          : null,
    };
  }

  private decodePostCursor(cursor: string) {
    try {
      return decodePostCursor(cursor);
    } catch {
      throw new CommunityInvalidCursorException();
    }
  }

  private decodeTwoFieldCursorSafe(cursor: string) {
    try {
      return decodeTwoFieldCursor(cursor);
    } catch {
      throw new CommunityInvalidCursorException();
    }
  }

  private async communityBySlug(slug: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }

  private async requireSubscription(
    communityId: string,
    userId: string,
  ): Promise<void> {
    const isModerator = await this.access.isModerator(communityId, userId);

    if (isModerator) {
      return;
    }

    const subscribed = await this.subscriptionRepository.isSubscribed(
      communityId,
      userId,
    );

    if (!subscribed) {
      throw new CommunityNotSubscribedException();
    }
  }

  private async invalidateFeed(communityId: string): Promise<void> {
    const keys: string[] = [];

    for (const sort of COMMUNITY_FEED_SORTS_ALL) {
      for (const limit of COMMUNITY_FEED_CACHE_LIMITS) {
        keys.push(
          communityFeedCacheKey(communityId, sort, null, limit, 'first'),
        );
      }
    }

    if (keys.length > 0) {
      await this.dbCache.delMany(COMMUNITY_FEED_CACHE, keys);
    }
  }

  private async postInCommunity(
    communityId: string,
    postId: string,
  ): Promise<CommunityPostWithRelations> {
    const post = await this.postRepository.findById(postId);

    if (!post || post.communityId !== communityId) {
      throw new CommunityPostNotFoundException();
    }

    return post;
  }

  private async commentInPost(
    postId: string,
    commentId: string,
  ): Promise<CommunityCommentWithRelations> {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment || comment.postId !== postId) {
      throw new CommunityCommentNotFoundException();
    }

    return comment;
  }
}
