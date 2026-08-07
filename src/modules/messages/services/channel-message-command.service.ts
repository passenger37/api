import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';

import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

@Injectable()
export class ChannelMessageCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly repository: ChannelMessageRepository,
    private readonly queryService: ChannelMessageQueryService,
    private readonly validation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  async sendMessage(
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

    const member = await this.memberQueryService.getMember(serverId, userId);

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

  async editMessage(
    messageId: string,
    serverId: string,
    userId: string,
    content: string,
  ) {
    this.validation.validateContent(content);

    await this.repository.findById(messageId);
    const message = await this.queryService.getMessage(messageId);

    const member = await this.memberQueryService.getMember(serverId, userId);

    await this.validation.validateEditPermission(
      message.authorMemberId,
      member.id,
      serverId,
      userId,
    );

    return this.repository.update(messageId, {
      content,

      isEdited: true,

      editedAt: new Date(),
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

    return this.repository.softDelete(messageId);
  }

  async pinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    return this.repository.pin(messageId);
  }

  async unpinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    return this.repository.unpin(messageId);
  }
}
