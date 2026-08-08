import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

@Injectable()
export class ChannelMessageReactionCommandService {
  constructor(
    private readonly repository: ChannelMessageReactionRepository,
    private readonly messageQueryService: ChannelMessageQueryService,
    private readonly validation: ChannelMessageValidationService,
    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  async addReaction(
    messageId: string,
    serverId: string,
    userId: string,
    emoji: string,
  ) {
    if (!emoji?.trim()) {
      throw new BadRequestException('Reaction emoji is required.');
    }

    const message = await this.messageQueryService.getMessage(messageId);

    if (message.serverId !== serverId) {
      throw new NotFoundException('Message not found.');
    }

    await this.validation.validateChannelAccess(message.channelId, userId);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const existing = await this.repository.findReaction(
      messageId,
      member.id,
      emoji,
    );

    if (existing) {
      return existing;
    }

    return this.repository.addReaction(messageId, member.id, emoji);
  }

  async removeReaction(
    messageId: string,
    serverId: string,
    userId: string,
    emoji: string,
  ) {
    if (!emoji?.trim()) {
      throw new BadRequestException('Reaction emoji is required.');
    }

    const message = await this.messageQueryService.getMessage(messageId);

    if (message.serverId !== serverId) {
      throw new NotFoundException('Message not found.');
    }

    await this.validation.validateChannelAccess(message.channelId, userId);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const reaction = await this.repository.findReaction(
      messageId,
      member.id,
      emoji,
    );

    if (!reaction) {
      throw new NotFoundException('Reaction not found.');
    }

    await this.repository.removeReaction(messageId, member.id, emoji);

    return {
      messageId,
      memberId: member.id,
      emoji,
    };
  }
}
