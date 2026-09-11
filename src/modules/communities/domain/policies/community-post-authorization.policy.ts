import { Injectable } from '@nestjs/common';
import { CommunityPost, CommunityPostStatus, CommunityPostVisibility } from '@prisma/client';

import { CommunityAccessService } from '../../services/community-access.service';
import { CommunitySubscriptionRepository } from '../../repositories/community-subscription.repository';

import { PostStatusVO } from '../value-objects/post-status.vo';
import { PostVisibilityVO } from '../value-objects/post-visibility.vo';

export interface PostAuthorizationContext {
  userId: string;
  post: CommunityPost;
  isModerator: boolean;
  isAdmin: boolean;
}

export interface PostActionResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class CommunityPostAuthorizationPolicy {
  constructor(
    private readonly accessService: CommunityAccessService,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
  ) {}

  async canCreatePost(
    communityId: string,
    userId: string,
  ): Promise<PostActionResult> {
    const isBanned = await this.accessService.isBanned(communityId, userId);
    if (isBanned) {
      return { allowed: false, reason: 'User is banned from this community' };
    }

    const isMember = await this.subscriptionRepository.isSubscribed(communityId, userId);
    if (!isMember) {
      return { allowed: false, reason: 'User is not a member of this community' };
    }

    const isMuted = await this.subscriptionRepository.isMuted(communityId, userId);
    if (isMuted) {
      return { allowed: false, reason: 'User is muted in this community' };
    }

    const isBannedFromPosting = await this.accessService.isBannedFromPosting(communityId, userId);
    if (isBannedFromPosting) {
      return { allowed: false, reason: 'User is banned from posting in this community' };
    }

    return { allowed: true };
  }

  async canEditPost(context: PostAuthorizationContext): Promise<PostActionResult> {
    const { userId, post, isModerator } = context;

    if (post.isDeleted || post.status === 'DELETED') {
      return { allowed: false, reason: 'Cannot edit a deleted post' };
    }

    if (post.status === 'LOCKED') {
      return { allowed: false, reason: 'Cannot edit a locked post' };
    }

    if (post.status === 'HIDDEN') {
      return { allowed: false, reason: 'Cannot edit a hidden post' };
    }

    if (post.authorUserId === context.userId) {
      return { allowed: true };
    }

    if (context.isModerator) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only the author or a moderator can edit this post' };
  }

  async canDeletePost(context: PostAuthorizationContext): Promise<PostActionResult> {
    const { userId, post, isModerator } = context;

    if (post.isDeleted) {
      return { allowed: false, reason: 'Post is already deleted' };
    }

    if (post.authorUserId === context.userId) {
      return { allowed: true };
    }

    if (context.isModerator) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only the author or a moderator can delete this post' };
  }

  async canRestorePost(context: PostAuthorizationContext): Promise<PostActionResult> {
    const { post, isModerator } = context;

    if (!post.isDeleted) {
      return { allowed: false, reason: 'Post is not deleted' };
    }

    if (context.isModerator) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only a moderator can restore a deleted post' };
  }

  async canVotePost(
    communityId: string,
    userId: string,
    post: { authorUserId: string; status: string; visibility: string; isDeleted: boolean },
  ): Promise<PostActionResult> {
    if (post.isDeleted || post.status === 'DELETED') {
      return { allowed: false, reason: 'Cannot vote on a deleted post' };
    }

    if (post.status === 'HIDDEN' || post.status === 'LOCKED') {
      return { allowed: false, reason: 'Cannot vote on a hidden or locked post' };
    }

    const isBanned = await this.accessService.isBannedFromVoting(communityId, userId);
    if (isBanned) {
      return { allowed: false, reason: 'User is banned from voting in this community' };
    }

    return { allowed: true };
  }

  async canBookmarkPost(
    userId: string,
    post: { authorUserId: string; status: string; isDeleted: boolean },
  ): Promise<PostActionResult> {
    if (post.isDeleted || post.status === 'DELETED') {
      return { allowed: false, reason: 'Cannot bookmark a deleted post' };
    }

    if (post.status === 'HIDDEN') {
      return { allowed: false, reason: 'Cannot bookmark a hidden post' };
    }

    return { allowed: true };
  }

  async canReportPost(
    userId: string,
    post: { authorUserId: string; status: string; isDeleted: boolean },
  ): Promise<PostActionResult> {
    if (post.isDeleted || post.status === 'DELETED') {
      return { allowed: false, reason: 'Cannot report a deleted post' };
    }

    if (post.authorUserId === userId) {
      return { allowed: false, reason: 'Cannot report your own post' };
    }

    return { allowed: true };
  }

  async canModeratePost(context: PostAuthorizationContext): Promise<PostActionResult> {
    const { post, isModerator } = context;

    if (!context.isModerator) {
      return { allowed: false, reason: 'Only moderators can perform this action' };
    }

    if (post.isDeleted) {
      return { allowed: false, reason: 'Cannot moderate a deleted post' };
    }

    return { allowed: true };
  }

  async canPinPost(context: PostAuthorizationContext): Promise<PostActionResult> {
    return this.canModeratePost(context);
  }

  async canLockPost(context: PostAuthorizationContext): Promise<PostActionResult> {
    return this.canModeratePost(context);
  }

  async canHidePost(context: PostAuthorizationContext): Promise<PostActionResult> {
    return this.canModeratePost(context);
  }

  async canModerateReport(
    communityId: string,
    userId: string,
  ): Promise<PostActionResult> {
    const isModerator = await this.accessService.isModerator(communityId, userId);
    if (!isModerator) {
      return { allowed: false, reason: 'Only moderators can moderate reports' };
    }

    return { allowed: true };
  }
}