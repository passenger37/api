import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelMessage } from '@prisma/client';

import { toClientMessage } from '../utils/message.mapper';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from '../repositories/channel-read-state.repository';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ChannelMessageCacheService } from './channel-message-cache.service';

@Injectable()
export class ChannelMessageQueryService {
  constructor(
    private readonly repository: ChannelMessageRepository,
    private readonly reactionRepository: ChannelMessageReactionRepository,
    private readonly editRepository: ChannelMessageEditRepository,
    private readonly mentionRepository: ChannelMentionRepository,
    private readonly readStateRepository: ChannelReadStateRepository,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly cache: ChannelMessageCacheService,
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
    const cached = await this.cache.getCachedPage<{
      items: ChannelMessage[];
      nextCursor: string | undefined;
      hasMore: boolean;
    }>(channelId, cursor, limit);

    if (cached) {
      return cached;
    }

    const messages = await this.repository.findManyByChannelPaginated(
      channelId,
      cursor,
      limit + 1,
    );
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    const result = {
      items: items.map(toClientMessage),
      nextCursor,
      hasMore,
    };

    await this.cache.cachePage(channelId, cursor, limit, result);

    return result;
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

    const mentionCounts = await this.mentionRepository.countMentionsByMessages(
      items.map((message) => message.id),
    );

    return {
      items: items.map((message) => ({
        ...message,
        reactionCounts: Object.fromEntries(
          reactionCounts.get(message.id) ?? new Map<string, number>(),
        ),
        mentionCount: mentionCounts.get(message.id) ?? 0,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
      hasMore,
    };
  }

  async messageExists(messageId: string) {
    return this.repository.exists(messageId);
  }

  async getMessageById(messageId: string) {
    const message = await this.repository.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    return message;
  }

  async getMessagesAfterInChannel(
    channelId: string,
    afterMessageId: string,
    take = 50,
  ) {
    const cached = await this.cache.getCachedMessagesAfter<
      Array<
        ChannelMessage & {
          reactionCounts: Record<string, number>;
          mentionCount: number;
        }
      >
    >(channelId, afterMessageId, take);

    if (cached) {
      return cached;
    }

    const messages = await this.repository.findMessagesAfterCursor(
      channelId,
      afterMessageId,
      take,
    );

    const reactionCounts =
      await this.reactionRepository.countReactionsByMessages(
        messages.map((message) => message.id),
      );

    const mentionCounts = await this.mentionRepository.countMentionsByMessages(
      messages.map((message) => message.id),
    );

    const enriched = messages.map((message) => ({
      ...message,
      reactionCounts: Object.fromEntries(
        reactionCounts.get(message.id) ?? new Map<string, number>(),
      ),
      mentionCount: mentionCounts.get(message.id) ?? 0,
    }));

    await this.cache.cacheMessagesAfter(
      channelId,
      afterMessageId,
      take,
      enriched,
    );

    return enriched;
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

    const channelId = message.channelId;

    const cached = await this.cache.getCachedThread<{
      items: Array<
        ChannelMessage & {
          reactionCounts: Record<string, number>;
          mentionCount: number;
        }
      >;
      nextCursor: string | undefined;
      hasMore: boolean;
      replyCount: number;
    }>(channelId, parentMessageId, cursor, limit);

    if (cached) {
      return {
        message: this.toMessageOrTombstone(message),
        ...cached,
      };
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

    const mentionCounts = await this.mentionRepository.countMentionsByMessages(
      items.map((item) => item.id),
    );

    const replyCount = await this.repository.countReplies(parentMessageId);

    const enriched = {
      items: items.map((item) => ({
        ...item,
        reactionCounts: Object.fromEntries(
          reactionCounts.get(item.id) ?? new Map<string, number>(),
        ),
        mentionCount: mentionCounts.get(item.id) ?? 0,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
      hasMore,
      replyCount,
    };

    await this.cache.cacheThread(
      channelId,
      parentMessageId,
      cursor,
      limit,
      enriched,
    );

    return {
      message: this.toMessageOrTombstone(message),
      ...enriched,
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

  async getMessageMentions(messageId: string) {
    await this.getMessage(messageId);

    return this.mentionRepository.findByMessage(messageId);
  }

  async getChannelReadState(
    serverId: string,
    channelId: string,
    userId: string,
  ) {
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    const state = await this.readStateRepository.findByChannelAndMember(
      channelId,
      member.id,
    );

    const version = await this.cache.getChannelVersion(channelId);
    const cachedUnread = await this.cache.getCachedUnread(
      channelId,
      member.id,
      version,
    );

    let unreadCount = cachedUnread;

    if (unreadCount === null) {
      unreadCount = await this.readStateRepository.countUnreadAfter(
        channelId,
        state?.lastReadAt ?? null,
      );

      await this.cache.cacheUnread(channelId, member.id, version, unreadCount);
    }

    return {
      channelId,
      lastReadMessageId: state?.lastReadMessageId ?? null,
      lastReadAt: state?.lastReadAt ?? null,
      unreadCount,
    };
  }
}
