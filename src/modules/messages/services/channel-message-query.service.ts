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

  async getChannelMessagesPaginated(
    channelId: string,
    cursor?: string,
    limit = 50,
  ) {
    const messages = await this.repository.findManyByChannelPaginated(
      channelId,
      cursor,
      limit + 1,
    );
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    return { items, nextCursor, hasMore };
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

  async getThreadRepliesPaginated(
    parentMessageId: string,
    cursor?: string,
    limit = 50,
  ) {
    const replies = await this.repository.findRepliesPaginated(
      parentMessageId,
      cursor,
      limit + 1,
    );
    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, limit) : replies;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    const replyCount = await this.repository.countReplies(parentMessageId);
    return { items, nextCursor, hasMore, replyCount };
  }

  async getChannel(channelId: string) {
    const channel = await this.repository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }
}
