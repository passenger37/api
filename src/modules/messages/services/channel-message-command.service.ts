import { forwardRef, Inject, Injectable } from '@nestjs/common';
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

    @Inject(forwardRef(() => ChannelMessageGateway))
    private readonly gateway: ChannelMessageGateway,

    private readonly repository: ChannelMessageRepository,

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

    return this.prisma.$transaction(async (tx) => {
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

    const updated = await this.repository.update(messageId, {
      content,

      isEdited: true,

      editedAt: new Date(),
    });

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
}
