import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';

import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

@Injectable()
export class ChannelMessageCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly gateway: ChannelMessageGateway,

    private readonly repository: ChannelMessageRepository,

    private readonly queryService: ChannelMessageQueryService,

    private readonly validation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  async createMessage(
    serverId: string,
    channelId: string,
    userId: string,
    content: string,
    parentMessageId?: string,
  ) {
    await this.validation.validateChannel(channelId);

    await this.validation.validateMember(serverId, userId);

    await this.validation.validateParentMessage(parentMessageId);

    this.validation.validateContent(content);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const message = await this.prisma.$transaction(async (tx) => {
      return this.repository.create(
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
    });

    this.gateway.broadcastMessageCreated(channelId, message);

    return message;
  }

  async editMessage(
    messageId: string,
    serverId: string,
    userId: string,
    content: string,
  ) {
    this.validation.validateContent(content);

    const message = await this.queryService.getMessage(messageId);

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

    const updated = await this.repository.update(messageId, {
      content,

      isEdited: true,

      editedAt: new Date(),
    });

    this.gateway.broadcastMessageUpdated(updated.channelId, updated);

    return updated;
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

    this.gateway.broadcastMessageDeleted(message.channelId, message.id);

    return {
      success: true,
    };
  }

  async pinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const pinned = await this.repository.pin(messageId);

    this.gateway.broadcastMessagePinned(pinned.channelId, pinned.id);

    return pinned;
  }

  async unpinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const unpinned = await this.repository.unpin(messageId);

    this.gateway.broadcastMessageUnpinned(unpinned.channelId, unpinned.id);

    return unpinned;
  }
}
