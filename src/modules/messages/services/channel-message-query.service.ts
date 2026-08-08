import { Injectable, NotFoundException } from '@nestjs/common';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';

@Injectable()
export class ChannelMessageQueryService {
  constructor(private readonly repository: ChannelMessageRepository) {}

  async getMessage(messageId: string) {
    const message = await this.repository.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    return message;
  }

  async getChannelMessages(channelId: string, skip = 0, take = 50) {
    return this.repository.findManyByChannel(channelId, skip, take);
  }

  async countMessages(channelId: string) {
    return this.repository.countChannelMessages(channelId);
  }

  async messageExists(messageId: string) {
    return this.repository.exists(messageId);
  }

  async getPinnedMessages(channelId: string) {
    return this.repository.findPinnedMessages(channelId);
  }

  async getThreadReplies(parentMessageId: string) {
    return this.repository.findReplies(parentMessageId);
  }

  async getChannel(channelId: string) {
    const channel = await this.repository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }
}
