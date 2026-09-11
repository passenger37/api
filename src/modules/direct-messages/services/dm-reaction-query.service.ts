import { Injectable, NotFoundException } from '@nestjs/common';

import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { DirectMessageReactionRepository } from '../repositories/direct-message-reaction.repository';
import { DmQueryService } from './dm-query.service';
import { serializeReactionSummary } from '../serializers/dm.serializer';

@Injectable()
export class DmReactionQueryService {
  constructor(
    private readonly messageRepository: DirectMessageRepository,
    private readonly reactionRepository: DirectMessageReactionRepository,
    private readonly queryService: DmQueryService,
  ) {}

  /**
   * Authoritative reaction summary for a single message, computed server-side.
   */
  async getReactions(messageId: string, viewerUserId: string) {
    const message = await this.messageRepository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    await this.queryService.getChannel(message.channelId, viewerUserId);

    const counts = await this.reactionRepository.countReactionsByMessages([
      messageId,
    ]);

    const viewer = await this.reactionRepository.viewerReactions(
      [messageId],
      viewerUserId,
    );

    return serializeReactionSummary(
      counts.get(messageId) ?? new Map<string, number>(),
      viewer.get(messageId) ?? new Set<string>(),
    );
  }
}
