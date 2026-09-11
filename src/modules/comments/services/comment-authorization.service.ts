import { Injectable } from '@nestjs/common';
import { PostVisibility, PostStatus, CommunityVisibility, CommunityPostStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import { CommunitySubscriptionRepository } from '../../communities/repositories/community-subscription.repository';
import { CommunityAccessService } from '../../communities/services/community-access.service';
import { ServerMemberRepository } from '../../servers/repositories/server-member.repository';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { ServerPermission } from '@prisma/client';

import {
  PostNotFoundException,
  PostNotVisibleException,
  PostLockedException,
  CommunityMembershipRequiredException,
  ServerMembershipRequiredException,
} from '../exceptions/comment.exceptions';
import { CommentPostType } from '@prisma/client';

export interface ResolvedPostContext {
  postId: string;
  postType: CommentPostType;
  authorId: string;
  visibility: string;
  status: string;
  lockedAt: Date | null;
  lockedReason: string | null;
  communityId?: string | null;
  serverId?: string | null;
  channelId?: string | null;
  isDeleted: boolean;
}

@Injectable()
export class CommentAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialRepository: UserSocialRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly communityAccess: CommunityAccessService,
    private readonly serverMemberRepository: ServerMemberRepository,
    private readonly serverPermissionService: ServerPermissionService,
  ) {}

  /**
   * Resolve a postId into its owning domain context and verify the post exists.
   * The comment module delegates post ownership/visibility to the owning domains.
   */
  async resolvePost(
    postId: string,
    postType: CommentPostType,
  ): Promise<ResolvedPostContext> {
    if (postType === 'COMMUNITY') {
      const post = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          authorUserId: true,
          visibility: true,
          status: true,
          lockedAt: true,
          lockedReason: true,
          communityId: true,
          isDeleted: true,
        },
      });

      if (!post || post.isDeleted || post.status === CommunityPostStatus.DELETED) {
        throw new PostNotFoundException(postId);
      }

      return {
        postId: post.id,
        postType: 'COMMUNITY',
        authorId: post.authorUserId,
        visibility: post.visibility,
        status: post.status,
        lockedAt: post.lockedAt,
        lockedReason: post.lockedReason,
        communityId: post.communityId,
        isDeleted: post.isDeleted,
      };
    }

    // PERSONAL or CHANNEL — both live in the unified Post model.
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        status: true,
        isDeleted: true,
        communityId: true,
        serverId: true,
        channelId: true,
        type: true,
      },
    });

    if (!post || post.isDeleted || post.status === PostStatus.DELETED) {
      throw new PostNotFoundException(postId);
    }

    if (postType === 'CHANNEL' && !post.channelId) {
      throw new PostNotFoundException(postId);
    }

    if (postType === 'PERSONAL' && post.channelId) {
      throw new PostNotFoundException(postId);
    }

    return {
      postId: post.id,
      postType,
      authorId: post.authorId,
      visibility: post.visibility,
      status: post.status,
      lockedAt: null,
      lockedReason: null,
      communityId: post.communityId,
      serverId: post.serverId,
      channelId: post.channelId,
      isDeleted: post.isDeleted,
    };
  }

  /**
   * Assert the user may comment on (or view comments of) the post.
   * Called before create/read APIs.
   */
  async assertCanAccessPost(
    context: ResolvedPostContext,
    userId: string,
    requireCommentPermission = true,
  ): Promise<void> {
    this.assertPostLifecycle(context);

    if (context.postType === 'PERSONAL') {
      await this.assertPersonalPostAccess(context, userId);
    } else if (context.postType === 'COMMUNITY') {
      await this.assertCommunityPostAccess(context, userId);
    } else {
      await this.assertChannelPostAccess(context, userId);
    }

    if (requireCommentPermission) {
      this.assertNotLocked(context);
    }
  }

  /**
   * Determine whether the user may moderate comments on the post's domain.
   */
  async canModerate(
    context: ResolvedPostContext,
    userId: string,
  ): Promise<boolean> {
    if (context.postType === 'COMMUNITY' && context.communityId) {
      return this.communityAccess.isModerator(context.communityId, userId);
    }

    if (context.postType === 'CHANNEL' && context.serverId) {
      return this.serverPermissionService.hasPermission(
        context.serverId,
        userId,
        ServerPermission.MANAGE_MESSAGES,
        context.channelId ?? undefined,
      );
    }

    // Personal posts — only the author.
    return context.authorId === userId;
  }

  async isModerator(
    context: ResolvedPostContext,
    userId: string,
  ): Promise<boolean> {
    return this.canModerate(context, userId);
  }

  private assertPostLifecycle(context: ResolvedPostContext): void {
    if (context.isDeleted || context.status === PostStatus.DELETED) {
      throw new PostNotFoundException(context.postId);
    }

    if (context.status === PostStatus.HIDDEN || context.status === 'HIDDEN') {
      throw new PostNotVisibleException();
    }
  }

  private assertNotLocked(context: ResolvedPostContext): void {
    if (context.status === PostStatus.LOCKED || context.lockedAt) {
      throw new PostLockedException();
    }
  }

  private async assertPersonalPostAccess(
    context: ResolvedPostContext,
    userId: string,
  ): Promise<void> {
    const blocked = await this.socialRepository.existsBlock(context.authorId, userId);
    if (blocked) {
      throw new PostNotVisibleException();
    }

    switch (context.visibility) {
      case PostVisibility.PUBLIC:
        return;
      case PostVisibility.PRIVATE:
        throw new PostNotVisibleException();
      case PostVisibility.FOLLOWERS:
      case PostVisibility.FRIENDS: {
        const isFollowing = await this.socialRepository.existsFollow(
          userId,
          context.authorId,
        );
        if (!isFollowing) {
          throw new PostNotVisibleException();
        }
        return;
      }
      case PostVisibility.COMMUNITY:
        if (context.authorId !== userId) {
          throw new PostNotVisibleException();
        }
        return;
      case PostVisibility.SERVER:
        // Personal-post SERVER visibility is scoped to the owning server.
        if (context.serverId) {
          const member = await this.serverMemberRepository.findByServerAndUser(
            context.serverId,
            userId,
          );
          if (!member) {
            throw new ServerMembershipRequiredException();
          }
          return;
        }
        if (context.authorId !== userId) {
          throw new PostNotVisibleException();
        }
        return;
      case PostVisibility.CUSTOM:
        // CUSTOM visibility defaults to the author for now; expand with circle
        // membership if the product ships audience selection.
        if (context.authorId !== userId) {
          throw new PostNotVisibleException();
        }
        return;
      default:
        throw new PostNotVisibleException();
    }
  }

  private async assertCommunityPostAccess(
    context: ResolvedPostContext,
    userId: string,
  ): Promise<void> {
    if (context.status === CommunityPostStatus.LOCKED) {
      throw new PostLockedException();
    }

    const community = await this.prisma.community.findUnique({
      where: { id: context.communityId ?? '' },
      select: { id: true, visibility: true, ownerId: true },
    });

    if (!community) {
      throw new PostNotVisibleException();
    }

    const isPublic = community.visibility === CommunityVisibility.PUBLIC;
    const isMember = await this.subscriptionRepository.isSubscribed(
      community.id,
      userId,
    );
    const isModerator = isMember ||
      (await this.communityAccess.isModerator(community.id, userId)) ||
      community.ownerId === userId;

    if (!isPublic && !isModerator) {
      throw new CommunityMembershipRequiredException();
    }

    // Post-level visibility: COMMUNITY_MEMBERS requires membership to comment.
    if (context.visibility !== 'PUBLIC' && !isMember && !isModerator) {
      throw new CommunityMembershipRequiredException();
    }
  }

  private async assertChannelPostAccess(
    context: ResolvedPostContext,
    userId: string,
  ): Promise<void> {
    if (!context.serverId || !context.channelId) {
      throw new PostNotVisibleException();
    }

    const member = await this.serverMemberRepository.findByServerAndUser(
      context.serverId,
      userId,
    );

    if (!member) {
      throw new ServerMembershipRequiredException();
    }

    const canView = await this.serverPermissionService.hasPermission(
      context.serverId,
      userId,
      ServerPermission.CHANNEL_VIEW,
      context.channelId,
    );

    if (!canView) {
      throw new PostNotVisibleException();
    }
  }
}