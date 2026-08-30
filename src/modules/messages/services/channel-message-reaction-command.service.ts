import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ChannelMessageCacheService } from './channel-message-cache.service';

@Injectable()
export class ChannelMessageReactionCommandService {
  constructor(
    private readonly repository: ChannelMessageReactionRepository,
    private readonly messageQueryService: ChannelMessageQueryService,
    private readonly validation: ChannelMessageValidationService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly cache: ChannelMessageCacheService,
  ) {}

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageQueryService.getMessage(messageId);

    await this.validation.validateChannelAccess(message.channelId, userId);

    const member = await this.memberQueryService.getMemberOrThrow(
      message.serverId,
      userId,
    );

    const existing = await this.repository.findOne(messageId, member.id, emoji);

    if (existing) {
      throw new BadRequestException('Reaction already exists.');
    }

    const created = await this.repository.create(messageId, member.id, emoji);

    await this.cache.invalidateChannel(message.channelId);

    return created;
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageQueryService.getMessage(messageId);

    await this.validation.validateChannelAccess(message.channelId, userId);

    const member = await this.memberQueryService.getMemberOrThrow(
      message.serverId,
      userId,
    );

    const existing = await this.repository.findOne(messageId, member.id, emoji);

    if (!existing) {
      throw new BadRequestException('Reaction does not exist.');
    }

    await this.repository.delete(messageId, member.id, emoji);

    await this.cache.invalidateChannel(message.channelId);

    return {
      messageId,
      memberId: member.id,
      emoji,
    };
  }
}
