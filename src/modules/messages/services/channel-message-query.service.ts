import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelMessage } from '@prisma/client';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';

@Injectable()
export class ChannelMessageQueryService {
  constructor(
    private readonly repository: ChannelMessageRepository,
    private readonly reactionRepository: ChannelMessageReactionRepository,
    private readonly editRepository: ChannelMessageEditRepository,
  ) {}

  async getMessage(messageId: string) {
    const message = await this.repository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    return message;
  }

  private toMessageOrTombstone(message: ChannelMessage) {
    if (!message.isDeleted) {
      return message;
    }

    return {
      id: message.id,
      channelId: message.channelId,
      serverId: message.serverId,
      isDeleted: true,
      deletedAt: message.deletedAt,
      content: null,
    };
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

  async getChannelMessagesWithReactionCounts(
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

    const reactionCounts =
      await this.reactionRepository.countReactionsByMessages(
        items.map((message) => message.id),
      );

    return {
      items: items.map((message) => ({
        ...message,
        reactionCounts: Object.fromEntries(
          reactionCounts.get(message.id) ?? new Map<string, number>(),
        ),
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
      hasMore,
    };
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

  async getThread(parentMessageId: string, cursor?: string, limit = 50) {
    const message = await this.repository.findById(parentMessageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const replies = await this.repository.findRepliesPaginated(
      parentMessageId,
      cursor,
      limit + 1,
    );
    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, limit) : replies;

    const reactionCounts =
      await this.reactionRepository.countReactionsByMessages(
        items.map((item) => item.id),
      );

    const replyCount = await this.repository.countReplies(parentMessageId);

    return {
      message: this.toMessageOrTombstone(message),
      items: items.map((item) => ({
        ...item,
        reactionCounts: Object.fromEntries(
          reactionCounts.get(item.id) ?? new Map<string, number>(),
        ),
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
      hasMore,
      replyCount,
    };
  }

  async getEditHistory(messageId: string, cursor?: string, limit = 50) {
    const message = await this.repository.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const edits = await this.editRepository.findManyByMessagePaginated(
      messageId,
      cursor,
      limit + 1,
    );
    const hasMore = edits.length > limit;
    const items = hasMore ? edits.slice(0, limit) : edits;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    const totalCount = await this.editRepository.countByMessage(messageId);
    return { items, nextCursor, hasMore, totalCount };
  }

  async getChannel(channelId: string) {
    const channel = await this.repository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }
}
