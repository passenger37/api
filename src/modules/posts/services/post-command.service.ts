import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PostStatus,
  PostVisibility,
  PostContentType,
  ReactionType,
  PostType,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { OutboxEventRepository } from '../../messages/repositories/outbox-event.repository';

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
} from '../dto/response/post.response';

import { encodePostCursor } from '../constants/post.constants';
import { POST_DEFAULTS } from '../constants/post.constants';

interface CreatePostInput {
  authorId: string;
  content?: string;
  visibility: PostVisibility;
  mediaIds?: string[];
  contentWarning?: string;
  isSensitive?: boolean;
  language?: string;
  scheduledAt?: Date;
}

interface UpdatePostInput {
  content?: string;
  visibility?: PostVisibility;
  contentWarning?: string | null;
  isSensitive?: boolean;
  language?: string | null;
}

@Injectable()
export class PostCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postRepository: PostRepository,
    private readonly reactionRepository: PostReactionRepository,
    private readonly bookmarkRepository: PostBookmarkRepository,
    private readonly mediaRepository: PostMediaRepository,
    private readonly reportRepository: PostReportRepository,
    private readonly socialRepository: UserSocialRepository,
    private readonly mediaProcessing: MediaProcessingService,
    private readonly outboxRepository: OutboxEventRepository,
  ) {}

  async createPost(input: CreatePostInput): Promise<PostDetailResponse> {
    // Validate content
    if (
      !input.content?.trim() &&
      (!input.mediaIds || input.mediaIds.length === 0)
    ) {
      throw new BadRequestException('Post must have content or media');
    }

    if (
      input.content &&
      input.content.length > POST_DEFAULTS.MAX_CONTENT_LENGTH
    ) {
      throw new BadRequestException(
        `Content exceeds maximum length of ${POST_DEFAULTS.MAX_CONTENT_LENGTH}`,
      );
    }

    if (
      input.mediaIds &&
      input.mediaIds.length > POST_DEFAULTS.MAX_MEDIA_COUNT
    ) {
      throw new BadRequestException(
        `Maximum ${POST_DEFAULTS.MAX_MEDIA_COUNT} media items allowed`,
      );
    }

    // Determine content type
    const hasContent = !!input.content?.trim();
    const hasMedia = input.mediaIds && input.mediaIds.length > 0;
    const contentType =
      hasContent && hasMedia
        ? PostContentType.MIXED
        : hasMedia
          ? PostContentType.MEDIA
          : PostContentType.TEXT;

    const post = await this.prisma.$transaction(async (tx) => {
      // Create post
      const created = await this.postRepository.create(
        {
          authorId: input.authorId,
          content: input.content?.trim(),
          contentType,
          visibility: input.visibility,
          contentWarning: input.contentWarning,
          isSensitive: input.isSensitive,
          language: input.language,
          scheduledAt: input.scheduledAt,
        },
        tx,
      );

      // Attach media if provided
      if (input.mediaIds && input.mediaIds.length > 0) {
        // Verify media ownership
        for (const mediaId of input.mediaIds) {
          const attachment = await tx.messageAttachment.findUnique({
            where: { id: mediaId },
            select: { id: true, userId: true, mimeType: true },
          });

          if (!attachment) {
            throw new BadRequestException(`Media ${mediaId} not found`);
          }

          if (attachment.userId !== input.authorId) {
            throw new ForbiddenException(
              `Cannot attach media owned by another user`,
            );
          }
        }

        // Create PostMedia entries
        await this.mediaRepository.createMany(
          created.id,
          input.mediaIds.map((id, index) => ({
            type: 'IMAGE',
            url: '',
            fileSize: 0,
            mimeType: 'image/jpeg',
            order: index,
          })),
          tx,
        );
      }

      // Publish PostCreated event
      await this.outboxRepository.create(
        {
          eventType: 'post-created',
          channelId: null,
          payload: {
            postId: created.id,
            authorId: input.authorId,
            content: created.content,
            visibility: created.visibility,
            createdAt: created.createdAt,
          },
        },
        tx,
      );

      return created;
    });

    return this.getPostDetail(post.id, input.authorId);
  }

  async updatePost(
    postId: string,
    userId: string,
    input: UpdatePostInput,
  ): Promise<PostDetailResponse> {
    const post = await this.postRepository.findByIdForUpdate(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException("Cannot edit another user's post");
    }

    if (post.isDeleted || post.status === PostStatus.DELETED) {
      throw new ForbiddenException('Cannot edit a deleted post');
    }

    // Validate content
    if (input.content !== undefined) {
      if (!input.content?.trim()) {
        throw new BadRequestException('Content cannot be empty');
      }
      if (input.content.length > POST_DEFAULTS.MAX_CONTENT_LENGTH) {
        throw new BadRequestException(
          `Content exceeds maximum length of ${POST_DEFAULTS.MAX_CONTENT_LENGTH}`,
        );
      }
    }

    const updated = await this.postRepository.update(postId, {
      ...input,
      editedAt: new Date(),
    });

    // Publish PostUpdated event
    await this.outboxRepository.create({
      eventType: 'post-updated',
      channelId: null,
      payload: {
        postId: updated.id,
        authorId: userId,
        content: updated.content,
        visibility: updated.visibility,
        updatedAt: updated.updatedAt,
      },
    });

    return this.getPostDetail(postId, userId);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findByIdForUpdate(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException("Cannot delete another user's post");
    }

    await this.postRepository.softDelete(postId);

    // Publish PostDeleted event
    await this.outboxRepository.create({
      eventType: 'post-deleted',
      channelId: null,
      payload: {
        postId,
        authorId: userId,
        deletedAt: new Date(),
      },
    });
  }

  async restorePost(
    postId: string,
    userId: string,
  ): Promise<PostDetailResponse> {
    const post = await this.postRepository.findByIdForUpdate(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException("Cannot restore another user's post");
    }

    if (!post.isDeleted) {
      throw new BadRequestException('Post is not deleted');
    }

    const restored = await this.postRepository.restore(postId);

    await this.outboxRepository.create({
      eventType: 'post-restored',
      channelId: null,
      payload: {
        postId: restored.id,
        authorId: userId,
        restoredAt: new Date(),
      },
    });

    return this.getPostDetail(postId, userId);
  }

  async reactToPost(
    postId: string,
    userId: string,
    type: ReactionType,
  ): Promise<{ reaction: any; isNew: boolean; previousType?: ReactionType }> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canInteractWithPost(userId, post))) {
      throw new ForbiddenException('Cannot react to this post');
    }

    const result = await this.reactionRepository.upsert(postId, userId, type);

    if (result.isNew) {
      await this.postRepository.incrementCount(postId, 'reactionCount');
    }

    // Publish ReactionAdded/Changed event
    await this.outboxRepository.create({
      eventType: result.isNew ? 'post-reaction-added' : 'post-reaction-changed',
      channelId: null,
      payload: {
        postId,
        userId,
        type: result.reaction.type,
        previousType: result.previousType,
        createdAt: result.reaction.createdAt,
      },
    });

    return {
      reaction: result.reaction,
      isNew: result.isNew,
      previousType: result.previousType,
    };
  }

  async removeReaction(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canInteractWithPost(userId, post))) {
      throw new ForbiddenException('Cannot remove reaction from this post');
    }

    const removed = await this.reactionRepository.remove(postId, userId);

    if (removed) {
      await this.postRepository.decrementCount(postId, 'reactionCount');

      await this.outboxRepository.create({
        eventType: 'post-reaction-removed',
        channelId: null,
        payload: {
          postId,
          userId,
          removedAt: new Date(),
        },
      });
    }
  }

  async bookmarkPost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canInteractWithPost(userId, post))) {
      throw new ForbiddenException('Cannot bookmark this post');
    }

    const existing = await this.bookmarkRepository.exists(postId, userId);
    if (!existing) {
      await this.bookmarkRepository.create(postId, userId);
      await this.postRepository.incrementCount(postId, 'repostCount'); // Using repostCount for bookmark count
    }
  }

  async removeBookmark(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.bookmarkRepository.remove(postId, userId);
    await this.postRepository.decrementCount(postId, 'repostCount');
  }

  async reportPost(
    postId: string,
    reporterUserId: string,
    reason: string,
    detailText?: string,
  ): Promise<void> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!(await this.canInteractWithPost(reporterUserId, post))) {
      throw new ForbiddenException('Cannot report this post');
    }

    if (post.authorId === reporterUserId) {
      throw new BadRequestException('Cannot report your own post');
    }

    const existing = await this.reportRepository.findByPostAndReporter(
      postId,
      reporterUserId,
    );
    if (existing) {
      throw new BadRequestException('You have already reported this post');
    }

    await this.reportRepository.create({
      postId,
      reporterUserId,
      reason: reason as any,
      detailText,
    });
  }

  async createRepost(
    originalPostId: string,
    userId: string,
    content?: string,
  ): Promise<PostDetailResponse> {
    const originalPost = await this.postRepository.findById(originalPostId);

    if (!originalPost) {
      throw new NotFoundException('Original post not found');
    }

    if (!(await this.canViewPost(userId, originalPost))) {
      throw new ForbiddenException('Cannot repost this post');
    }

    // Check if already reposted
    const existingRepost = await this.prisma.post.findFirst({
      where: {
        originalPostId,
        authorId: userId,
        isDeleted: false,
      },
    });

    if (existingRepost) {
      throw new BadRequestException('Already reposted');
    }

    const repost = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: userId,
          content: content?.trim() || null,
          contentType: PostContentType.TEXT,
          visibility: PostVisibility.PUBLIC,
          originalPostId,
          type: PostType.POST,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      await this.outboxRepository.create(
        {
          eventType: 'post-reposted',
          channelId: null,
          payload: {
            repostId: created.id,
            originalPostId,
            userId,
            createdAt: created.createdAt,
          },
        },
        tx,
      );

      return created;
    });

    // Increment repost count on original
    await this.postRepository.incrementCount(originalPostId, 'repostCount');

    return this.getPostDetail(repost.id, userId);
  }

  async removeRepost(originalPostId: string, userId: string): Promise<void> {
    const repost = await this.prisma.post.findFirst({
      where: {
        originalPostId,
        authorId: userId,
        isDeleted: false,
      },
    });

    if (!repost) {
      throw new NotFoundException('Repost not found');
    }

    await this.postRepository.softDelete(repost.id);
    await this.postRepository.decrementCount(originalPostId, 'repostCount');
  }

  async createQuotePost(
    quotedPostId: string,
    userId: string,
    content: string,
    visibility: PostVisibility = PostVisibility.PUBLIC,
  ): Promise<PostDetailResponse> {
    const quotedPost = await this.postRepository.findById(quotedPostId);

    if (!quotedPost) {
      throw new NotFoundException('Quoted post not found');
    }

    if (!(await this.canViewPost(userId, quotedPost))) {
      throw new ForbiddenException('Cannot quote this post');
    }

    if (!content?.trim()) {
      throw new BadRequestException('Quote post must have content');
    }

    const quotePost = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: userId,
          content: content.trim(),
          contentType: PostContentType.MIXED,
          visibility,
          quotedPostId,
          type: PostType.POST,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      await this.outboxRepository.create(
        {
          eventType: 'post-quoted',
          channelId: null,
          payload: {
            quotePostId: created.id,
            quotedPostId,
            userId,
            createdAt: created.createdAt,
          },
        },
        tx,
      );

      return created;
    });

    return this.getPostDetail(quotePost.id, userId);
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.postRepository.incrementCount(postId, 'viewCount');
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

  private async canInteractWithPost(
    viewerId: string,
    post: any,
  ): Promise<boolean> {
    return this.canViewPost(viewerId, post);
  }

  private async getPostDetail(
    postId: string,
    viewerId: string,
  ): Promise<PostDetailResponse> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const postAny = post as any;

    const [viewerReaction, isBookmarked, reactionCounts] = await Promise.all([
      this.reactionRepository.getViewerReaction(postId, viewerId),
      this.bookmarkRepository.exists(postId, viewerId),
      this.reactionRepository.getReactionCounts(postId),
    ]);

    return PostMapper.toDetailResponse(postAny, {
      viewerReaction,
      isBookmarked,
      reactionCounts,
      canEdit: post.authorId === viewerId,
      canDelete: post.authorId === viewerId,
    });
  }
}
