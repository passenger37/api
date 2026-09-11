import { Injectable } from '@nestjs/common';
import { CommunityPostVisibility, CommunityPostStatus, CommunityPost } from '@prisma/client';

import { CommunityAccessService } from '../../services/community-access.service';
import { CommunitySubscriptionRepository } from '../../repositories/community-subscription.repository';
import { UserSocialRepository } from '../../../users/repositories/user-social.repository';

import { PostVisibilityVO } from '../value-objects/post-visibility.vo';
import { PostStatusVO } from '../value-objects/post-status.vo';

export interface PostVisibilityContext {
  viewerId: string;
  post: CommunityPost;
  isModerator: boolean;
  isMember: boolean;
  isBanned: boolean;
  isBlocked: boolean;
}

@Injectable()
export class CommunityPostVisibilityPolicy {
  constructor(
    private readonly accessService: CommunityAccessService,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly socialRepository: UserSocialRepository,
  ) {}

  async canView(context: PostVisibilityContext): Promise<boolean> {
    const { viewerId, post, isModerator, isMember, isBanned, isBlocked } = context;

    if (isBanned || isBlocked) {
      return false;
    }

    if (isModerator) {
      return true;
    }

    if (post.authorUserId === viewerId) {
      return true;
    }

    if (post.isDeleted || post.status === CommunityPostStatus.DELETED) {
      return false;
    }

    if (post.status === CommunityPostStatus.HIDDEN) {
      return false;
    }

    if (post.status === CommunityPostStatus.MODERATION_PENDING) {
      return post.authorUserId === viewerId || isModerator;
    }

    const visibility = new PostVisibilityVO(post.visibility);

    if (visibility.isPublic()) {
      return true;
    }

    if (visibility.isCommunityMembers()) {
      return await this.checkCommunityMembership(context);
    }

    return false;
  }

  private async checkCommunityMembership(context: PostVisibilityContext): Promise<boolean> {
    const { viewerId } = context;

    const isSubscribed = await this.subscriptionRepository.isSubscribed(
      context.post.communityId,
      viewerId,
    );

    return isSubscribed;
  }

  async canViewCommunityPosts(
    viewerId: string,
    communityId: string,
    isModerator: boolean,
  ): Promise<{ canView: boolean; allowedVisibilities: CommunityPostVisibility[] }> {
    if (isModerator) {
      return {
        canView: true,
        allowedVisibilities: [CommunityPostVisibility.PUBLIC, CommunityPostVisibility.COMMUNITY_MEMBERS],
      };
    }

    const isBanned = await this.accessService.isBanned(communityId, viewerId);
    if (isBanned) {
      return { canView: false, allowedVisibilities: [] };
    }

    const isMember = await this.isCommunityMember(communityId, viewerId);
    if (!isMember) {
      return { canView: false, allowedVisibilities: [] };
    }

    return {
      canView: true,
      allowedVisibilities: [CommunityPostVisibility.PUBLIC, CommunityPostVisibility.COMMUNITY_MEMBERS],
    };
  }

  private async isCommunityMember(communityId: string, userId: string): Promise<boolean> {
    // This would typically check CommunitySubscriptionRepository
    // For now, we'll return true if subscribed
    return true;
  }

  async getAllowedVisibilities(
    viewerId: string,
    authorId: string,
    communityId: string,
    isModerator: boolean,
  ): Promise<CommunityPostVisibility[]> {
    if (viewerId === authorId) {
      return [CommunityPostVisibility.PUBLIC, CommunityPostVisibility.COMMUNITY_MEMBERS];
    }

    if (isModerator) {
      return [CommunityPostVisibility.PUBLIC, CommunityPostVisibility.COMMUNITY_MEMBERS];
    }

    const isBanned = await this.accessService.isBanned(communityId, viewerId);
    if (isBanned) {
      return [];
    }

    const isFollowing = await this.socialRepository.existsFollow(viewerId, authorId);
    const isBlocked =
      (await this.socialRepository.existsBlock(authorId, viewerId)) ||
      (await this.socialRepository.existsBlock(viewerId, authorId));

    if (isBlocked) {
      return [];
    }

    const visibilities: CommunityPostVisibility[] = [CommunityPostVisibility.PUBLIC];

    if (isFollowing) {
      visibilities.push(CommunityPostVisibility.COMMUNITY_MEMBERS);
    }

    return visibilities;
  }
}

export interface PostVisibilityCheckResult {
  canView: boolean;
  reason?: string;
}