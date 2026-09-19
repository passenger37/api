import { BadRequestException, Injectable } from '@nestjs/common';

import { ChannelType, ServerPermission } from '@prisma/client';

import { FeedRepository } from '../repositories/feed.repository';

import { ServerPermissionService } from '../../servers/services/server-permission.service';

import { FeedMapper } from '../mappers/feed.mapper';

import { FeedFilter, GetFeedQuery } from '../dto/request/get-feed.query';

import { FeedResponse } from '../dto/response/feed.response';

import type { FeedCursor } from '../queries/feed-message.query';

const FEED_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.TEXT,
  ChannelType.ANNOUNCEMENT,
  ChannelType.FORUM,
]);

const DEFAULT_FEED_LIMIT = 25;

@Injectable()
export class FeedService {
  constructor(
    private readonly repository: FeedRepository,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async getFeed(userId: string, query: GetFeedQuery): Promise<FeedResponse> {
    const filter = query.filter ?? FeedFilter.LATEST;

    const limit = query.limit ?? DEFAULT_FEED_LIMIT;

    const cursor = this.decodeCursor(query.cursor);

    const serverIds = await this.repository.findMemberServers(userId);

    if (serverIds.length === 0) {
      return this.emptyFeed();
    }

    const channels = await this.repository.findMemberServerChannels(serverIds);

    const viewableChannelIds = await this.resolveViewableChannelIds(
      userId,
      channels,
    );

    if (viewableChannelIds.length === 0) {
      return this.emptyFeed();
    }

    const params: {
      channelIds: string[];
      userIds?: string[];
      cursor?: FeedCursor | null;
      take: number;
    } = {
      channelIds: viewableChannelIds,
      cursor,
      take: limit + 1,
    };

    if (filter === FeedFilter.FOLLOWING) {
      const followedUserIds = await this.repository.findFollowedUserIds(userId);

      params.userIds = followedUserIds;
    }

    const rows = await this.repository.findFeedPage(params);

    const hasMore = rows.length > limit;

    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const hydrated = await this.repository.hydrateMessages(
      pageRows.map((row) => row.id),
    );

    const messagesById = new Map(
      hydrated.map((message) => [message.id, message]),
    );

    const items = pageRows
      .map((row) => messagesById.get(row.id))
      .filter((message) => !!message)
      .map((message) => FeedMapper.toItem(message));

    const lastItem = pageRows[pageRows.length - 1];

    return {
      items,
      nextCursor: hasMore && lastItem ? this.encodeCursor(lastItem) : undefined,
      hasMore,
    };
  }

  private async resolveViewableChannelIds(
    userId: string,
    channels: Array<{ id: string; serverId: string; type: string }>,
  ): Promise<string[]> {
    const viewable: string[] = [];

    for (const channel of channels) {
      if (!FEED_CHANNEL_TYPES.has(channel.type as ChannelType)) {
        continue;
      }

      const allowed = await this.permissionService.hasPermission(
        channel.serverId,
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

  private emptyFeed(): FeedResponse {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false,
    };
  }

  private encodeCursor(message: { createdAt: Date; id: string }): string {
    return Buffer.from(
      `${message.createdAt.toISOString()}|${message.id}`,
    ).toString('base64url');
  }

  private decodeCursor(cursor?: string): FeedCursor | null {
    if (!cursor) {
      return null;
    }

    let decoded: string;

    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid feed cursor.');
    }

    const separatorIndex = decoded.indexOf('|');

    if (separatorIndex <= 0) {
      throw new BadRequestException('Invalid feed cursor.');
    }

    const createdAtIso = decoded.slice(0, separatorIndex);

    const id = decoded.slice(separatorIndex + 1);

    const createdAt = new Date(createdAtIso);

    if (Number.isNaN(createdAt.getTime()) || !id) {
      throw new BadRequestException('Invalid feed cursor.');
    }

    return { createdAt, id };
  }
}
