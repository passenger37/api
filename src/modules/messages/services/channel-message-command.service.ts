import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from '../repositories/channel-read-state.repository';
import { ChannelMentionResolver } from './channel-mention-resolver.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

@Injectable()
export class ChannelMessageCommandService {
  constructor(
    private readonly prisma: PrismaService,

    @Inject(forwardRef(() => ChannelMessageGateway))
    private readonly gateway: ChannelMessageGateway,

    private readonly repository: ChannelMessageRepository,

    private readonly editRepository: ChannelMessageEditRepository,

    private readonly mentionRepository: ChannelMentionRepository,

    private readonly mentionResolver: ChannelMentionResolver,

    private readonly readStateRepository: ChannelReadStateRepository,

    private readonly queryService: ChannelMessageQueryService,

    private readonly validation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  async createMessage(
    channelId: string,
    userId: string,
    content: string,
    parentMessageId?: string,
  ) {
    const channel = await this.validation.validateSendPermission(
      channelId,
      userId,
    );

    const serverId = channel.serverId;

    await this.validation.validateParentMessage(parentMessageId, channelId);

    this.validation.validateContent(content);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const mentions = await this.mentionResolver.resolve(
      content,
      serverId,
      channelId,
      userId,
    );

    return this.prisma.$transaction(async (tx) => {
      const message = await this.repository.create(
        {
          content,

          server: {
            connect: {
              id: serverId,
            },
          },

          channel: {
            connect: {
              id: channelId,
            },
          },

          author: {
            connect: {
              id: member.id,
            },
          },

          ...(parentMessageId && {
            parentMessage: {
              connect: {
                id: parentMessageId,
              },
            },
          }),
        },
        tx,
      );

      await this.mentionRepository.createMany(
        message.id,
        serverId,
        channelId,
        mentions,
        tx,
      );

      return message;
    });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    this.validation.validateContent(content);

    const message = await this.queryService.getMessage(messageId);
    const serverId = message.serverId;
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    await this.validation.validateEditPermission(
      message.authorMemberId,
      member.id,
      serverId,
      userId,
    );

    const editedAt = new Date();

    const mentions = await this.mentionResolver.resolve(
      content,
      serverId,
      message.channelId,
      userId,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.editRepository.create(
        {
          message: {
            connect: {
              id: messageId,
            },
          },

          previousContent: message.content,

          editedAt,

          editedBy: {
            connect: {
              id: member.id,
            },
          },
        },
        tx,
      );

      await this.mentionRepository.deleteManyByMessage(messageId, tx);

      await this.mentionRepository.createMany(
        messageId,
        serverId,
        message.channelId,
        mentions,
        tx,
      );

      return this.repository.update(
        messageId,
        {
          content,

          isEdited: true,

          editedAt,
        },
        tx,
      );
    });
  }

  async deleteMessage(messageId: string, serverId: string, userId: string) {
    const message = await this.queryService.getMessage(messageId);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    await this.validation.validateDeletePermission(
      message.authorMemberId,
      member.id,
      serverId,
      userId,
    );

    await this.repository.softDelete(messageId);

    return {
      success: true,
    };
  }

  async pinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const pinned = await this.repository.pin(messageId);

    return pinned;
  }

  async unpinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const unpinned = await this.repository.unpin(messageId);

    return unpinned;
  }

  async markChannelRead(
    channelId: string,
    userId: string,
    lastReadMessageId?: string,
  ) {
    const { member } = await this.validation.validateChannelAccess(
      channelId,
      userId,
    );

    const existing = await this.readStateRepository.findByChannelAndMember(
      channelId,
      member.id,
    );

    const candidate = lastReadMessageId
      ? await this.repository.findById(lastReadMessageId)
      : await this.readStateRepository.findLatestMessage(channelId);

    if (lastReadMessageId && !candidate) {
      throw new BadRequestException(
        'Read cursor references an unknown message.',
      );
    }

    if (candidate && candidate.channelId !== channelId) {
      throw new BadRequestException(
        'Read cursor message belongs to another channel.',
      );
    }

    const cursor = candidate
      ? {
          lastReadMessageId: candidate.id,
          lastReadAt: candidate.createdAt,
        }
      : {
          lastReadMessageId: null,
          lastReadAt: new Date(),
        };

    const canAdvance =
      !existing?.lastReadAt || cursor.lastReadAt > existing.lastReadAt;

    const state = canAdvance
      ? await this.readStateRepository.upsert(channelId, member.id, cursor)
      : existing;

    const unreadCount = await this.readStateRepository.countUnreadAfter(
      channelId,
      state.lastReadAt,
    );

    return {
      channelId,
      lastReadMessageId: state.lastReadMessageId,
      lastReadAt: state.lastReadAt,
      unreadCount,
    };
  }
}
