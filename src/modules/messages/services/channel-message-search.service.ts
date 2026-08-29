import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ChannelType, ServerPermission } from '@prisma/client';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { MessageSearchCursor } from '../queries/message-search.query';

const SEARCHABLE_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.TEXT,
  ChannelType.ANNOUNCEMENT,
  ChannelType.FORUM,
]);

export interface MessageSearchOptions {
  q: string;
  channelId?: string;
  authorMemberId?: string;
  after?: Date;
  before?: Date;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ChannelMessageSearchService {
  constructor(
    private readonly repository: ChannelMessageRepository,
    private readonly reactionRepository: ChannelMessageReactionRepository,
    private readonly mentionRepository: ChannelMentionRepository,
    private readonly channelQueryService: ServerChannelQueryService,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async search(
    serverId: string,
    userId: string,
    options: MessageSearchOptions,
  ) {
    const query = options.q.trim();

    if (!query.length) {
      throw new BadRequestException('Search query cannot be empty.');
    }

    await this.memberQueryService.getMemberOrThrow(serverId, userId);

    const channelIds = await this.resolveSearchableChannelIds(
      serverId,
      userId,
      options.channelId,
    );

    if (channelIds.length === 0) {
      return { items: [], nextCursor: undefined, hasMore: false };
    }

    const limit = options.limit ?? 25;
    const cursor = this.decodeCursor(options.cursor);

    const rows = await this.repository.searchMessages({
      channelIds,
      query,
      authorMemberId: options.authorMemberId,
      after: options.after,
      before: options.before,
      cursor,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const reactionCounts =
      await this.reactionRepository.countReactionsByMessages(
        items.map((message) => message.id),
      );

    const mentionCounts = await this.mentionRepository.countMentionsByMessages(
      items.map((message) => message.id),
    );

    const lastItem = items[items.length - 1];

    return {
      items: items.map((message) => ({
        ...message,
        reactionCounts: Object.fromEntries(
          reactionCounts.get(message.id) ?? new Map<string, number>(),
        ),
        mentionCount: mentionCounts.get(message.id) ?? 0,
      })),
      nextCursor: hasMore && lastItem ? this.encodeCursor(lastItem) : undefined,
      hasMore,
    };
  }

  private async resolveSearchableChannelIds(
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<string[]> {
    if (channelId) {
      const channel =
        await this.channelQueryService.getChannelOrThrow(channelId);

      if (channel.serverId !== serverId) {
        throw new ForbiddenException('Channel does not belong to this server.');
      }

      const allowed = await this.permissionService.hasPermission(
        serverId,
        userId,
        ServerPermission.CHANNEL_VIEW,
        channelId,
      );

      if (!allowed) {
        throw new ForbiddenException(
          'You do not have permission to view this channel.',
        );
      }

      return [channel.id];
    }

    const channels = await this.channelQueryService.getServerChannels(serverId);
    const viewable: string[] = [];

    for (const channel of channels) {
      if (!SEARCHABLE_CHANNEL_TYPES.has(channel.type)) {
        continue;
      }

      const allowed = await this.permissionService.hasPermission(
        serverId,
        userId,
        ServerPermission.CHANNEL_VIEW,
        channel.id,
      );

      if (allowed) {
        viewable.push(channel.id);
      }
    }

    return viewable;
  }

  private encodeCursor(message: { createdAt: Date; id: string }): string {
    return Buffer.from(
      `${message.createdAt.toISOString()}|${message.id}`,
    ).toString('base64url');
  }

  private decodeCursor(cursor?: string): MessageSearchCursor | null {
    if (!cursor) {
      return null;
    }

    let decoded: string;
    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid search cursor.');
    }

    const separatorIndex = decoded.indexOf('|');

    if (separatorIndex <= 0) {
      throw new BadRequestException('Invalid search cursor.');
    }

    const createdAtIso = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);
    const createdAt = new Date(createdAtIso);

    if (Number.isNaN(createdAt.getTime()) || !id) {
      throw new BadRequestException('Invalid search cursor.');
    }

    return { createdAt, id };
  }
}
