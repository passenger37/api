import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { DirectMessageReactionRepository } from '../repositories/direct-message-reaction.repository';
import { DmQueryService } from './dm-query.service';
import { DmGateway } from '../gateways/dm.gateway';

@Injectable()
export class DmReactionCommandService {
  constructor(
    private readonly messageRepository: DirectMessageRepository,
    private readonly reactionRepository: DirectMessageReactionRepository,
    private readonly queryService: DmQueryService,
    @Inject(forwardRef(() => DmGateway))
    private readonly gateway: DmGateway,
  ) {}

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    await this.queryService.getChannel(message.channelId, userId);

    const existing = await this.reactionRepository.find(
      messageId,
      userId,
      emoji,
    );

    if (existing) {
      throw new BadRequestException('Reaction already exists.');
    }

    const reaction = await this.reactionRepository.add(
      messageId,
      userId,
      emoji,
    );

    this.gateway.broadcastReactionAdded(message.channelId, {
      channelId: message.channelId,
      messageId,
      userId,
      emoji,
      createdAt: reaction.createdAt,
    });

    return { messageId, userId, emoji };
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    await this.queryService.getChannel(message.channelId, userId);

    const existing = await this.reactionRepository.find(
      messageId,
      userId,
      emoji,
    );

    if (!existing) {
      throw new BadRequestException('Reaction does not exist.');
    }

    await this.reactionRepository.remove(messageId, userId, emoji);

    this.gateway.broadcastReactionRemoved(message.channelId, {
      channelId: message.channelId,
      messageId,
      userId,
      emoji,
    });

    return { messageId, userId, emoji };
  }
}
