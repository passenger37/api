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
    // 1. Validate channel and get the channel record.
    const channel = await this.validation.validateChannel(channelId);

    // 2. Get server from the channel.
    const serverId = channel.serverId;

    // 3. Validate that the user belongs to the server.
    await this.validation.validateMember(serverId, userId);

    // 4. Validate reply target if this is a reply.
    await this.validation.validateParentMessage(parentMessageId);

    // 5. Validate message content.
    this.validation.validateContent(content);

    // 6. Get the server member.
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    // 7. Create message inside a transaction.
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
