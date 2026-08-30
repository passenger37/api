import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

export const MESSAGE_READ_CACHE_TTL_SECONDS = 10;

@Injectable()
export class ChannelMessageCacheService {
  private readonly versionPrefix = 'msg:ver:';
  private readonly pagePrefix = 'msg:page:';
  private readonly afterPrefix = 'msg:after:';
  private readonly threadPrefix = 'msg:thread:';
  private readonly unreadPrefix = 'msg:unread:';
  private readonly ttlSeconds = MESSAGE_READ_CACHE_TTL_SECONDS;

  constructor(private readonly redis: RedisService) {}

  async getChannelVersion(channelId: string): Promise<number> {
    const raw = await this.redis.get(`${this.versionPrefix}${channelId}`);

    if (raw === null) {
      return 0;
    }

    const version = Number(raw);

    return Number.isFinite(version) ? version : 0;
  }

  async invalidateChannel(channelId: string): Promise<void> {
    await this.redis.incr(`${this.versionPrefix}${channelId}`);
  }

  async getCachedPage<T>(
    channelId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<T | null> {
    const version = await this.getChannelVersion(channelId);

    return this.getJson<T>(
      this.pageKey(channelId, version, cursor ?? 'start', limit),
    );
  }

  async cachePage<T>(
    channelId: string,
    cursor: string | undefined,
    limit: number,
    payload: T,
  ): Promise<void> {
    const version = await this.getChannelVersion(channelId);

    await this.setJson(
      this.pageKey(channelId, version, cursor ?? 'start', limit),
      payload,
    );
  }

  async getCachedMessagesAfter<T>(
    channelId: string,
    afterMessageId: string,
    take: number,
  ): Promise<T | null> {
    const version = await this.getChannelVersion(channelId);

    return this.getJson<T>(
      this.afterKey(channelId, version, afterMessageId, take),
    );
  }

  async cacheMessagesAfter<T>(
    channelId: string,
    afterMessageId: string,
    take: number,
    payload: T,
  ): Promise<void> {
    const version = await this.getChannelVersion(channelId);

    await this.setJson(
      this.afterKey(channelId, version, afterMessageId, take),
      payload,
    );
  }

  async getCachedThread<T>(
    channelId: string,
    parentMessageId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<T | null> {
    const version = await this.getChannelVersion(channelId);

    return this.getJson<T>(
      this.threadKey(
        channelId,
        version,
        parentMessageId,
        cursor ?? 'start',
        limit,
      ),
    );
  }

  async cacheThread<T>(
    channelId: string,
    parentMessageId: string,
    cursor: string | undefined,
    limit: number,
    payload: T,
  ): Promise<void> {
    const version = await this.getChannelVersion(channelId);

    await this.setJson(
      this.threadKey(
        channelId,
        version,
        parentMessageId,
        cursor ?? 'start',
        limit,
      ),
      payload,
    );
  }

  async getCachedUnread(
    channelId: string,
    memberId: string,
    version: number,
  ): Promise<number | null> {
    const raw = await this.redis.get(
      this.unreadKey(channelId, memberId, version),
    );

    if (raw === null) {
      return null;
    }

    const count = Number(raw);

    return Number.isFinite(count) ? count : null;
  }

  async cacheUnread(
    channelId: string,
    memberId: string,
    version: number,
    count: number,
  ): Promise<void> {
    await this.redis.set(
      this.unreadKey(channelId, memberId, version),
      String(count),
      this.ttlSeconds,
    );
  }

  private pageKey(
    channelId: string,
    version: number,
    cursor: string,
    limit: number,
  ): string {
    return `${this.pagePrefix}${channelId}:${version}:${cursor}:${limit}`;
  }

  private afterKey(
    channelId: string,
    version: number,
    afterMessageId: string,
    take: number,
  ): string {
    return `${this.afterPrefix}${channelId}:${version}:${afterMessageId}:${take}`;
  }

  private threadKey(
    channelId: string,
    version: number,
    parentMessageId: string,
    cursor: string,
    limit: number,
  ): string {
    return `${this.threadPrefix}${channelId}:${version}:${parentMessageId}:${cursor}:${limit}`;
  }

  private unreadKey(
    channelId: string,
    memberId: string,
    version: number,
  ): string {
    return `${this.unreadPrefix}${channelId}:${memberId}:${version}`;
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async setJson<T>(key: string, payload: T): Promise<void> {
    await this.redis.set(key, JSON.stringify(payload), this.ttlSeconds);
  }
}
