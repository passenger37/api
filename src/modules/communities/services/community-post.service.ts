import { Injectable } from '@nestjs/common';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityAccessDeniedException,
  CommunityCommentNotFoundException,
  CommunityNotFoundException,
  CommunityPostNotFoundException,
  CommunityNotSubscribedException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityPostRepository } from '../repositories/community-post.repository';
import { CommunityCommentRepository } from '../repositories/community-comment.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
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
import { serializePost, serializeComment } from '../mappers/community.mapper';

@Injectable()
export class CommunityPostService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly postRepository: CommunityPostRepository,
    private readonly commentRepository: CommunityCommentRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly access: CommunityAccessService,
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
      authorUserId: userId,
      title: request.title,
      content: request.content,
    });

    const withRelations = (await this.postRepository.findById(post.id))!;

    return serializePost(withRelations);
  }

  async updatePost(
    slug: string,
    postId: string,
    userId: string,
    request: UpdatePostRequest,
  ): Promise<PostResponse> {
    const community = await this.communityBySlug(slug);

    const post = await this.postInCommunity(community.id, postId);

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

    return serializePost(withRelations);
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

    const posts = categoryId
      ? await this.postRepository.findPageByCategory(
          community.id,
          categoryId,
          limit,
          cursor,
        )
      : await this.postRepository.findPage(community.id, limit, cursor);

    const nextCursor =
      posts.length === limit ? (posts[posts.length - 1]?.id ?? null) : null;

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

    let parentId: string | null = null;

    if (request.parentId) {
      const parent = await this.commentInPost(post.id, request.parentId);

      parentId = parent.id;
    }

    const comment = await this.commentRepository.create({
      post: { connect: { id: post.id } },
      authorUserId: userId,
      content: request.content,
      parent: parentId ? { connect: { id: parentId } } : undefined,
    });

    const withRelations = (await this.commentRepository.findById(comment.id))!;

    return serializeComment({
      ...withRelations,
      replies: [],
    });
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

    const parent = await this.commentInPost(post.id, commentId);

    const comment = await this.commentRepository.create({
      post: { connect: { id: post.id } },
      authorUserId: userId,
      content: request.content,
      parent: { connect: { id: parent.id } },
    });

    const withRelations = (await this.commentRepository.findById(comment.id))!;

    return serializeComment({
      ...withRelations,
      replies: [],
    });
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

    await this.postInCommunity(community.id, comment.postId);

    const isModerator = await this.access.isModerator(community.id, userId);

    if (comment.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    await this.commentRepository.update(commentId, {
      content: request.content,
      version: { increment: 1 },
    });

    const withRelations = (await this.commentRepository.findById(commentId))!;

    return serializeComment({
      ...withRelations,
      replies: [],
    });
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

    await this.postInCommunity(community.id, comment.postId);

    const isModerator = await this.access.isModerator(community.id, userId);

    if (comment.authorUserId !== userId && !isModerator) {
      throw new CommunityAccessDeniedException();
    }

    await this.commentRepository.softDelete(commentId);
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

    await this.postInCommunity(community.id, postId);

    const comments = await this.commentRepository.listPostComments(
      postId,
      limit,
      cursor,
    );

    const nextCursor =
      comments.length === limit
        ? (comments[comments.length - 1]?.id ?? null)
        : null;

    return {
      items: comments.map(serializeComment),
      nextCursor,
    };
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
