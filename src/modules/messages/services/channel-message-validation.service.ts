import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { NexusException } from '../../../common/error/nexus.exception';
import { NexusErrorCode } from '../../../common/error/nexus-error-code';
import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

@Injectable()
export class ChannelMessageValidationService {
  static readonly MAX_MESSAGE_LENGTH = 4000;

  constructor(
    private readonly repository: ChannelMessageRepository,

    private readonly channelQueryService: ServerChannelQueryService,

    private readonly memberQueryService: ServerMemberQueryService,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async validateChannel(channelId: string) {
    return this.channelQueryService.getChannel(channelId);
  }
  async validateMember(serverId: string, userId: string) {
    await this.memberQueryService.getMemberOrThrow(serverId, userId);
  }

  validateContent(content: string) {
    const value = content.trim();

    if (!value.length) {
      throw new NexusException(
        NexusErrorCode.MESSAGE_EMPTY,
        'Message cannot be empty.',
      );
    }

    if (value.length > ChannelMessageValidationService.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Message exceeds ${ChannelMessageValidationService.MAX_MESSAGE_LENGTH} characters.`,
      );
    }
  }

  async validateParentMessage(parentMessageId?: string) {
    if (!parentMessageId) {
      return;
    }

    const exists = await this.repository.exists(parentMessageId);

    if (!exists) {
      throw new BadRequestException('Reply target does not exist.');
    }
  }

  async validateEditPermission(
    messageAuthorId: string,
    currentMemberId: string,
    serverId: string,
    userId: string,
  ) {
    if (messageAuthorId === currentMemberId) {
      return;
    }

    const hasPermission = await this.permissionService.hasPermission(
      serverId,
      userId,
      ServerPermission.MANAGE_MESSAGES,
    );

    if (!hasPermission) {
      throw new ForbiddenException('You cannot edit this message.');
    }
  }

  async validateDeletePermission(
    authorMemberId: string,
    requesterMemberId: string,
    serverId: string,
    userId: string,
  ): Promise<void> {
    // Message author can delete their own message.
    if (authorMemberId === requesterMemberId) {
      return;
    }

    // Other users need message-management permission.
    const allowed = await this.permissionService.hasPermission(
      serverId,
      userId,
      ServerPermission.MANAGE_MESSAGES,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to delete this message.',
      );
    }
  }

  async validatePinPermission(serverId: string, userId: string) {
    const hasPermission = await this.permissionService.hasPermission(
      serverId,
      userId,
      ServerPermission.MANAGE_MESSAGES,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Missing MANAGE_MESSAGES permission.');
    }
  }

  async validateChannelAccess(channelId: string, userId: string) {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    const member = await this.memberQueryService.getMemberOrThrow(
      channel.serverId,
      userId,
    );

    await this.permissionService.requirePermission(
      channel.serverId,
      userId,
      ServerPermission.CHANNEL_VIEW,
      channelId,
    );

    return {
      channel,
      member,
    };
  }

  async validateSendPermission(channelId: string, userId: string) {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    await this.memberQueryService.getMemberOrThrow(channel.serverId, userId);

    await this.permissionService.requirePermission(
      channel.serverId,
      userId,
      ServerPermission.MESSAGE_SEND,
      channelId,
    );

    return channel;
  }

  async validateChannelViewPermission(channelId: string, userId: string) {
    const channel = await this.channelQueryService.getChannelOrThrow(channelId);

    const member = await this.memberQueryService.getMemberOrThrow(
      channel.serverId,
      userId,
    );

    await this.permissionService.requirePermission(
      channel.serverId,
      userId,
      ServerPermission.CHANNEL_VIEW,
      channelId,
    );

    return {
      channel,
      member,
    };
  }
}
