import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';

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
    await this.channelQueryService.getChannel(channelId);
  }

  async validateMember(serverId: string, userId: string) {
    await this.memberQueryService.getMemberOrThrow(serverId, userId);
  }

  validateContent(content: string) {
    const value = content.trim();

    if (!value.length) {
      throw new BadRequestException('Message cannot be empty.');
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
      throw new ForbiddenException('You cannot delete this message.');
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
}
