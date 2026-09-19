import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ShareDestinationType } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';
import { OutboxEventRepository } from '../../../messages/repositories/outbox-event.repository';

import { PostRepository } from '../../repositories/post.repository';
import { PostShareRepository } from '../../infrastructure/repositories/post-share.repository';

import { PostSharePolicy } from '../../domain/policies/post-share.policy';
import {
  PostShareMapper,
  CreatePostShareResponse,
} from '../../mappers/post-share.mapper';

import { ChannelMessageCommandService } from '../../../messages/services/channel-message-command.service';
import { DmCommandService } from '../../../direct-messages/services/dm-command.service';

const POST_SHARE_LINK_BASE = 'https://nexus.app/posts';

const POST_SHARED_OUTBOX_EVENT = 'post-shared';

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
  isDeleted: boolean;
  status: string;
  visibility: string;
  contentWarning?: string | null;
  isSensitive?: boolean;
}

interface SharedPost {
  id: string;
  content: string | null;
  User?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
}

@Injectable()
export class CreatePostShareCommandService {
  private readonly logger = new Logger(CreatePostShareCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postRepository: PostRepository,
    private readonly postShareRepository: PostShareRepository,
    private readonly postSharePolicy: PostSharePolicy,
    private readonly outboxRepository: OutboxEventRepository,
    private readonly channelMessageCommandService: ChannelMessageCommandService,
    private readonly dmCommandService: DmCommandService,
  ) {}

  async createPostShare(
    input: CreatePostShareInput,
  ): Promise<CreatePostShareResponse> {
    const { DM, SERVER_CHANNEL, COPY_LINK, EXTERNAL } = ShareDestinationType;

    if (input.clientRequestId) {
      const existing = await this.postShareRepository.findByIdempotencyKey(
        input.actorId,
        input.clientRequestId,
      );

      if (existing) {
        return PostShareMapper.toCreateResponse(existing);
      }
    }

    const post = await this.postRepository.findById(input.postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const postForPolicy = this.toPostForShare(post);

    await this.postSharePolicy.canSharePost(input.actorId, postForPolicy);

    if (input.destinationType === DM) {
      if (!input.destinationId) {
        throw new BadRequestException(
          'destinationId is required for DM destination',
        );
      }

      await this.postSharePolicy.canShareToDm(
        input.actorId,
        input.destinationId,
      );
    } else if (input.destinationType === SERVER_CHANNEL) {
      if (!input.destinationId) {
        throw new BadRequestException(
          'destinationId is required for SERVER_CHANNEL destination',
        );
      }

      await this.postSharePolicy.canShareToChannel(
        input.actorId,
        input.destinationId,
      );
    } else if (input.destinationType === COPY_LINK) {
      await this.postSharePolicy.canCopyLink(input.actorId, postForPolicy);
    } else if (input.destinationType === EXTERNAL) {
      await this.postSharePolicy.canShareExternally(
        input.actorId,
        postForPolicy,
      );
    }

    // The share record and the duplicate-safe outbox signal are written in a
    // single transaction. Message delivery intentionally happens AFTER commit:
    // DmCommandService.send / ChannelMessageCommandService.createMessage each
    // open their own interactive transaction and broadcast via their gateway,
    // so they must not run inside this transaction (Prisma rejects nested
    // interactive transactions).
    const share = await this.prisma.$transaction(async (tx) => {
      const created = await this.postShareRepository.create(
        {
          postId: input.postId,
          actorUserId: input.actorId,
          destinationType: input.destinationType,
          destinationId: input.destinationId,
          clientRequestId: input.clientRequestId,
        },
        tx,
      );

      await this.outboxRepository.create(
        {
          eventType: POST_SHARED_OUTBOX_EVENT,
          channelId: null,
          payload: {
            shareId: created.id,
            postId: input.postId,
            actorId: input.actorId,
            destinationType: input.destinationType,
            destinationId: input.destinationId ?? null,
            createdAt: created.createdAt,
          },
        },
        tx,
      );

      return created;
    });

    // Deliver the share summary to the destination. A failure here surfaces
    // as an error even though the share row is committed; the client retries
    // with the same clientRequestId to re-run delivery.
    if (input.destinationType === DM) {
      await this.deliverToDm(input.actorId, input.destinationId!, post);
    } else if (input.destinationType === SERVER_CHANNEL) {
      await this.deliverToChannel(input.actorId, input.destinationId!, post);
    }

    return PostShareMapper.toCreateResponse(share);
  }

  async getShareLink(actorId: string, postId: string): Promise<string> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postSharePolicy.canCopyLink(actorId, this.toPostForShare(post));

    return `${POST_SHARE_LINK_BASE}/${post.id}`;
  }

  private async deliverToDm(
    actorId: string,
    conversationId: string,
    post: SharedPost,
  ): Promise<void> {
    const content = this.buildShareContent(post);

    try {
      await this.dmCommandService.send(conversationId, actorId, content);
    } catch (error) {
      this.logger.error(
        `Failed to deliver shared post to DM conversation=${conversationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async deliverToChannel(
    actorId: string,
    channelId: string,
    post: SharedPost,
  ): Promise<void> {
    const content = this.buildShareContent(post);

    try {
      // createMessage resolves the author's ServerMember itself; it expects
      // the User id, not the ServerMember id.
      await this.channelMessageCommandService.createMessage(
        channelId,
        actorId,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deliver shared post to channel=${channelId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private buildShareContent(post: SharedPost): string {
    const author =
      post.User?.displayName ?? post.User?.username ?? 'unknown user';

    const preview = (post.content ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

    const excerpt = preview ? `: "${preview}"` : '';

    return `Shared ${author}'s post${excerpt}\n${POST_SHARE_LINK_BASE}/${post.id}`;
  }

  private toPostForShare(post: {
    id: string;
    authorId: string;
    isDeleted: boolean;
    status: string;
    visibility: string;
    contentWarning?: string | null;
    isSensitive?: boolean;
  }): PostForShare {
    return {
      id: post.id,
      authorId: post.authorId,
      isDeleted: post.isDeleted,
      status: post.status,
      visibility: post.visibility,
      contentWarning: post.contentWarning,
      isSensitive: post.isSensitive,
    };
  }
}
