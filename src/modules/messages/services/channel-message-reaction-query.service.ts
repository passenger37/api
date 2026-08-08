import { Injectable } from '@nestjs/common';

import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';

@Injectable()
export class ChannelMessageReactionQueryService {
  constructor(private readonly repository: ChannelMessageReactionRepository) {}

  /**
   * Get all reactions for a message.
   */
  async getMessageReactions(messageId: string) {
    return this.repository.findByMessage(messageId);
  }

  /**
   * Check whether a member has reacted to a message
   * with a specific emoji.
   */
  async hasReaction(
    messageId: string,
    memberId: string,
    emoji: string,
  ): Promise<boolean> {
    const reaction = await this.repository.find(messageId, memberId, emoji);

    return !!reaction;
  }

  /**
   * Get a specific reaction.
   */
  async getReaction(messageId: string, memberId: string, emoji: string) {
    return this.repository.find(messageId, memberId, emoji);
  }

  /**
   * Get reaction counts grouped by emoji.
   */
  async getReactionCounts(messageId: string) {
    const reactions = await this.repository.findByMessage(messageId);

    const counts = new Map<string, number>();

    for (const reaction of reactions) {
      const current = counts.get(reaction.emoji) ?? 0;

      counts.set(reaction.emoji, current + 1);
    }

    return Object.fromEntries(counts);
  }
}
