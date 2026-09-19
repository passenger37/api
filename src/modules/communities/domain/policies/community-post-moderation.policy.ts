import { Injectable } from '@nestjs/common';
import {
  CommunityPost,
  CommunityPostStatus,
  CommunityModerationActionType,
} from '@prisma/client';

import { CommunityModerationService } from '../../services/community-moderation.service';
import { CommunityModerationActionRepository } from '../../repositories/community-moderation-action.repository';

import { PostStatusVO } from '../value-objects/post-status.vo';

export interface ModerationContext {
  moderatorId: string;
  communityId: string;
  post: CommunityPost;
  reason?: string;
}

export interface ModerationResult {
  success: boolean;
  action: CommunityModerationActionType;
  post: CommunityPost;
  reason?: string;
}

@Injectable()
export class CommunityPostModerationPolicy {
  constructor(
    private readonly moderationService: CommunityModerationService,
    private readonly moderationActionRepository: CommunityModerationActionRepository,
  ) {}

  async lockPost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (post.status === CommunityPostStatus.LOCKED) {
      throw new Error('Post is already locked');
    }

    if (post.isDeleted) {
      throw new Error('Cannot lock a deleted post');
    }

    const updatedPost = await this.moderationService.lockPost(
      post.id,
      moderatorId,
      reason,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_LOCKED,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_LOCKED,
      post: updatedPost,
      reason,
    };
  }

  async unlockPost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (post.status !== CommunityPostStatus.LOCKED) {
      throw new Error('Post is not locked');
    }

    const updatedPost = await this.moderationService.unlockPost(
      post.id,
      moderatorId,
      reason,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_UNLOCKED,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_UNLOCKED,
      post: updatedPost,
      reason,
    };
  }

  async hidePost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (post.status === CommunityPostStatus.HIDDEN) {
      throw new Error('Post is already hidden');
    }

    if (post.isDeleted) {
      throw new Error('Cannot hide a deleted post');
    }

    const updatedPost = await this.moderationService.hidePost(
      post.id,
      moderatorId,
      reason,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_HIDDEN,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_HIDDEN,
      post: updatedPost,
      reason,
    };
  }

  async unhidePost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (post.status !== CommunityPostStatus.HIDDEN) {
      throw new Error('Post is not hidden');
    }

    const updatedPost = await this.moderationService.unhidePost(
      post.id,
      moderatorId,
      reason,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_UNHIDDEN,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_UNHIDDEN,
      post: updatedPost,
      reason,
    };
  }

  async pinPost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (post.isPinned) {
      throw new Error('Post is already pinned');
    }

    if (post.isDeleted || post.status === CommunityPostStatus.DELETED) {
      throw new Error('Cannot pin a deleted post');
    }

    const updatedPost = await this.moderationService.pinPost(
      post.id,
      moderatorId,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_PINNED,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_PINNED,
      post: updatedPost,
      reason,
    };
  }

  async unpinPost(context: ModerationContext): Promise<ModerationResult> {
    const { moderatorId, communityId, post, reason } = context;

    if (!post.isPinned) {
      throw new Error('Post is not pinned');
    }

    const updatedPost = await this.moderationService.unpinPost(
      post.id,
      moderatorId,
    );

    await this.moderationActionRepository.create({
      community: { connect: { id: communityId } },
      moderatorUserId: moderatorId,
      actionType: CommunityModerationActionType.POST_UNPINNED,
      objectType: 'CommunityPost',
      objectId: post.id,
      reason,
    });

    return {
      success: true,
      action: CommunityModerationActionType.POST_UNPINNED,
      post: updatedPost,
      reason,
    };
  }

  async canModeratePost(
    post: CommunityPost,
    isModerator: boolean,
  ): Promise<boolean> {
    if (!isModerator) {
      return false;
    }

    if (post.isDeleted || post.status === CommunityPostStatus.DELETED) {
      return false;
    }

    return true;
  }

  async canLock(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    if (!(await this.canModeratePost(post, true))) {
      return false;
    }

    return post.status !== CommunityPostStatus.LOCKED;
  }

  async canUnlock(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    if (!(await this.canModeratePost(post, true))) {
      return false;
    }

    return post.status === CommunityPostStatus.LOCKED;
  }

  async canHide(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    if (!(await this.canModeratePost(post, true))) {
      return false;
    }

    return post.status !== CommunityPostStatus.HIDDEN;
  }

  async canUnhide(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    if (!(await this.canModeratePost(post, true))) {
      return false;
    }

    return post.status === CommunityPostStatus.HIDDEN;
  }

  async canPin(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    return (await this.canModeratePost(post, true)) && !post.isPinned;
  }

  async canUnpin(context: ModerationContext): Promise<boolean> {
    const { post } = context;

    return (await this.canModeratePost(post, true)) && post.isPinned;
  }

  async handleReport(
    reportId: string,
    moderatorId: string,
    communityId: string,
    action: 'RESOLVE' | 'DISMISS',
    resolutionNote?: string,
  ): Promise<{ success: boolean; report: unknown }> {
    return {
      success: true,
      report: { id: reportId, status: action },
    };
  }

  async getModerationHistory(
    communityId: string,
    postId: string,
  ): Promise<{
    actions: Array<{
      id: string;
      actionType: string;
      moderatorUserId: string;
      reason: string | null;
      createdAt: Date;
    }>;
  }> {
    return { actions: [] };
  }
}

export interface ModerationActionInput {
  postId: string;
  moderatorId: string;
  communityId: string;
  action: 'LOCK' | 'UNLOCK' | 'HIDE' | 'UNHIDE' | 'PIN' | 'UNPIN';
  reason?: string;
}
