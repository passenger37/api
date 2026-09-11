import { Injectable } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';
import { UserSocialRepository } from '../../../users/repositories/user-social.repository';
import { ServerMemberQueryService } from '../../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../../servers/services/server-permission.service';
import { ServerPermission } from '@prisma/client';

interface PostForSharePolicy {
  id: string;
  authorId: string;
  isDeleted: boolean;
  status: string;
  visibility: string;
  contentWarning?: string | null;
  isSensitive?: boolean;
}

@Injectable()
export class PostSharePolicy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialRepository: UserSocialRepository,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async canSharePost(actorId: string, post: PostForSharePolicy): Promise<void> {
    if (post.isDeleted || post.status === 'DELETED') {
      throw new ForbiddenException('Cannot share a deleted post');
    }

    if (post.status === 'HIDDEN') {
      throw new ForbiddenException('Cannot share a hidden post');
    }

    if (post.visibility === 'PRIVATE') {
      throw new ForbiddenException('Cannot share a private post');
    }

    if (post.visibility === 'FOLLOWERS' || post.visibility === 'FRIENDS') {
      const isFollowing = await this.socialRepository.existsFollow(actorId, post.authorId);
      const isBlocked = await this.socialRepository.existsBlock(post.authorId, actorId) ||
                         await this.socialRepository.existsBlock(actorId, post.authorId);

      if (isBlocked) {
        throw new ForbiddenException('Cannot share this post');
      }

      if (!isFollowing) {
        throw new ForbiddenException('Cannot share a followers-only post');
      }
    }

    if (post.status === 'MODERATION_PENDING') {
      throw new ForbiddenException('Cannot share a post under moderation');
    }
  }

  async canShareToDm(actorId: string, conversationId: string): Promise<void> {
    const conversation = await this.prisma.directMessageChannel.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.userAId === actorId || conversation.userBId === actorId;
    if (!isMember) {
      throw new ForbiddenException('Not a member of this conversation');
    }
  }

  async canShareToChannel(actorId: string, channelId: string): Promise<void> {
    const channel = await this.prisma.serverChannel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true, type: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (!['TEXT', 'ANNOUNCEMENT', 'FORUM'].includes(channel.type)) {
      throw new ForbiddenException('Cannot share to this channel type');
    }

    const member = await this.memberQueryService.getMember(channel.serverId, actorId);
    if (!member) {
      throw new ForbiddenException('Not a member of this server');
    }

    const canSend = await this.permissionService.hasPermission(
      channel.serverId,
      actorId,
      ServerPermission.MESSAGE_SEND,
      channel.id,
    );

    if (!canSend) {
      throw new ForbiddenException('Cannot send messages in this channel');
    }
  }

  async canCopyLink(actorId: string, post: PostForSharePolicy): Promise<void> {
    if (post.visibility === 'PRIVATE') {
      throw new ForbiddenException('Cannot copy link to a private post');
    }
  }

  async canShareExternally(actorId: string, post: PostForSharePolicy): Promise<void> {
    if (post.visibility !== 'PUBLIC') {
      throw new ForbiddenException('Cannot share non-public post externally');
    }
  }
}