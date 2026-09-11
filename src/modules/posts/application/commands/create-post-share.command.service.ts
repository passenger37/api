import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Post, PostShare, ShareDestinationType } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';
import { OutboxEventRepository } from '../../../messages/repositories/outbox-event.repository';

import { PostRepository } from '../../repositories/post.repository';
import { PostShareRepository } from '../../infrastructure/repositories/post-share.repository';

import { PostSharePolicy } from '../../domain/policies/post-share.policy';
import { PostShareMapper, CreatePostShareResponse } from '../../mappers/post-share.mapper';
import { CreatePostShareDto } from '../../dto/request/create-post-share.request';

import { ChannelMessageCommandService } from '../../../messages/services/channel-message-command.service';
import { DmCommandService } from '../../../direct-messages/services/dm-command.service';
import { ServerMemberQueryService } from '../../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../../servers/services/server-permission.service';
import { ServerPermission } from '@prisma/client';

interface CreatePostShareInput {
  actorId: string;
  postId: string;
  destinationType: ShareDestinationType;
  destinationId?: string;
  clientRequestId?: string;
}

interface PostForShare {
  id: string;
  authorId: string;
  deletedAt: Date | null;
  status: string;
  visibility: string;
  contentWarning?: string | null;
  isSensitive?: boolean;
}

@Injectable()
export class CreatePostShareCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postRepository: PostRepository,
    private readonly postShareRepository: PostShareRepository,
    private readonly postSharePolicy: PostSharePolicy,
    private readonly outboxRepository: OutboxEventRepository,
    private readonly channelMessageCommandService: ChannelMessageCommandService,
    private readonly dmCommandService: DmCommandService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async createPostShare(input: CreatePostShareInput): Promise<CreatePostShareResponse> {
    const { DM, SERVER_CHANNEL, COPY_LINK, EXTERNAL } = ShareDestinationType;

    if (input.clientRequestId) {
      const existing = await this.postShareRepository.findByIdempotencyKey(input.actorId, input.clientRequestId);
      if (existing) {
        return PostShareMapper.toCreateResponse(existing);
      }
    }

    const post = await this.postRepository.findById(input.postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const postForPolicy: PostForShare = {
      id: post.id,
      authorId: post.authorId,
      deletedAt: post.deletedAt,
      isDeleted: post.isDeleted,
      status: post.status,
      visibility: post.visibility,
      contentWarning: post.contentWarning,
      isSensitive: post.isSensitive,
    };

    await this.postSharePolicy.canSharePost(input.actorId, postForPolicy);

    if (input.destinationType === DM) {
      if (!input.destinationId) {
        throw new BadRequestException('destinationId is required for DM destination');
      }
      await this.postSharePolicy.canShareToDm(input.actorId, input.destinationId);
    } else if (input.destinationType === SERVER_CHANNEL) {
      if (!input.destinationId) {
        throw new BadRequestException('destinationId is required for SERVER_CHANNEL destination');
      }
      await this.postSharePolicy.canShareToChannel(input.actorId, input.destinationId);
    } else if (input.destinationType === COPY_LINK) {
      await this.postSharePolicy.canCopyLink(input.actorId, postForPolicy);
    } else if (input.destinationType === EXTERNAL) {
      await this.postSharePolicy.canShareExternally(input.actorId, postForPolicy);
    }

    const share = await this.prisma.$transaction(async (tx) => {
      const share = await this.postShareRepository.create({
        postId: input.postId,
        actorUserId: input.actorId,
        destinationType: input.destinationType,
        destinationId: input.destinationId,
        clientRequestId: input.clientRequestId,
      }, tx);

      if (input.destinationType === DM) {
        await this.deliverToDm(input.actorId, input.destinationId!, share.id, tx);
      } else if (input.destinationType === SERVER_CHANNEL) {
        await this.deliverToChannel(input.actorId, input.destinationId!, share.id, tx);
      }

      await this.outboxRepository.create({
        eventType: 'post-shared',
        channelId: null,
        payload: {
          shareId: share.id,
          postId: input.postId,
          actorId: input.actorId,
          destinationType: input.destinationType,
          destinationId: input.destinationId,
          createdAt: share.createdAt,
        },
      }, tx);

      return share;
    });

    return PostShareMapper.toCreateResponse(share);
  }

  private async deliverToDm(actorId: string, conversationId: string, shareId: string, tx: Prisma.TransactionClient): Promise<void> {
    const content = `[Post shared]`;
    await this.dmCommandService.send(
      conversationId,
      actorId,
      content,
    );
  }

  private async deliverToChannel(actorId: string, channelId: string, shareId: string, tx: Prisma.TransactionClient): Promise<void> {
    const channel = await this.prisma.serverChannel.findUnique({
      where: { id: channelId },
      select: { serverId: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    const member = await this.memberQueryService.getMemberOrThrow(channel.serverId, actorId);

    const content = `[Post shared]`;
    await this.channelMessageCommandService.createMessage(
      channelId,
      member.id,
      content,
    );
  }
}

interface PostForShare {
  id: string;
  authorId: string;
  isDeleted: boolean;
  status: string;
  visibility: string;
  contentWarning?: string | null;
  isSensitive?: boolean;
}