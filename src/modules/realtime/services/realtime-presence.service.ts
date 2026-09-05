import { Injectable, Logger } from '@nestjs/common';

import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
import { RedisService } from '../../../core/redis/redis.service';
import {
  RealtimePresencePrivacy,
  RealtimePresenceStatus,
  RealtimeSessionInfo,
  RealtimeUserPresence,
} from '../types/realtime.types';
import { DEFAULT_PRESENCE_PRIVACY } from '../constants/realtime.constants';

const SESSION_DEVICE_UNKNOWN = 'unknown';

@Injectable()
export class RealtimePresenceService {
  private readonly logger = new Logger(RealtimePresenceService.name);

  constructor(private readonly redis: RedisService) {}

  async attachSession(userId: string, sessionId: string): Promise<void> {
    const session: RealtimeSessionInfo = {
      sessionId,
      userId,
      lastSeen: Date.now(),
      device: SESSION_DEVICE_UNKNOWN,
    };

    const client = this.redis.getClient();

    await this.redis.set(
      redisKeys.presenceSession(sessionId),
      JSON.stringify(session),
      REDIS_TTL.SESSION_PRESENCE,
    );

    await client.sAdd(redisKeys.presenceUserSessions(userId), sessionId);
  }

  async detachSession(userId: string, sessionId: string): Promise<void> {
    await this.redis.del(redisKeys.presenceSession(sessionId));

    const client = this.redis.getClient();

    await client.sRem(redisKeys.presenceUserSessions(userId), sessionId);

    await this.cleanupUser(userId);
  }

  async heartbeat(userId: string, sessionId: string): Promise<void> {
    const sessionKey = redisKeys.presenceSession(sessionId);

    const raw = await this.redis.get(sessionKey);

    if (raw) {
      const session: RealtimeSessionInfo = {
        ...JSON.parse(raw),
        lastSeen: Date.now(),
      };

      await this.redis.set(
        sessionKey,
        JSON.stringify(session),
        REDIS_TTL.SESSION_PRESENCE,
      );
    } else {
      await this.attachSession(userId, sessionId);
    }

    await this.commitUserPresence(userId, RealtimePresenceStatus.ONLINE);
  }

  async touchUser(userId: string): Promise<void> {
    const key = redisKeys.presenceUser(userId);

    if (await this.redis.exists(key)) {
      await this.redis.expire(key, REDIS_TTL.SESSION_PRESENCE);
    }
  }

  async getStatus(userId: string): Promise<RealtimeUserPresence> {
    const cached = await this.getCachedUserPresence(userId);

    if (cached) {
      return cached;
    }

    await this.cleanupUser(userId);

    return this.commitUserPresence(userId);
  }

  async setStatus(
    userId: string,
    status: RealtimePresenceStatus,
    privacy?: RealtimePresencePrivacy,
  ): Promise<RealtimeUserPresence> {
    if (status === RealtimePresenceStatus.OFFLINE) {
      return this.commitUserPresence(
        userId,
        RealtimePresenceStatus.OFFLINE,
        privacy,
      );
    }

    return this.commitUserPresence(userId, status, privacy);
  }

  async getVisibleStatus(userId: string): Promise<RealtimeUserPresence> {
    const presence = await this.getStatus(userId);

    if (presence.status === RealtimePresenceStatus.INVISIBLE) {
      return {
        ...presence,
        status: RealtimePresenceStatus.OFFLINE,
      };
    }

    return presence;
  }

  async getPrivacy(userId: string): Promise<RealtimePresencePrivacy> {
    const presence = await this.getStatus(userId);

    return this.normalizePrivacy(presence.privacy);
  }

  async canViewerSeePresence(
    targetUserId: string,
    viewerUserId: string,
  ): Promise<boolean> {
    if (targetUserId === viewerUserId) {
      return true;
    }

    const privacy = await this.getPrivacy(targetUserId);

    switch (privacy) {
      case RealtimePresencePrivacy.NOBODY:
        return false;
      case RealtimePresencePrivacy.EVERYONE:
        return true;
      default:
        return true;
    }
  }

  normalizePrivacy(
    privacy: RealtimePresencePrivacy | string | undefined,
  ): RealtimePresencePrivacy {
    if (
      privacy &&
      Object.values(RealtimePresencePrivacy).includes(privacy as never)
    ) {
      return privacy as RealtimePresencePrivacy;
    }

    return DEFAULT_PRESENCE_PRIVACY as RealtimePresencePrivacy;
  }

  async listActiveSessionIds(userId: string): Promise<string[]> {
    const client = this.redis.getClient();

    const members = await client.sMembers(redisKeys.presenceUserSessions(userId));

    return members ?? [];
  }

  async getSessionCount(userId: string): Promise<number> {
    const client = this.redis.getClient();

    const count = await client.sCard(redisKeys.presenceUserSessions(userId));

    return count ?? 0;
  }

  async cleanupUser(userId: string): Promise<void> {
    const sessionIds = await this.listActiveSessionIds(userId);

    for (const sessionId of sessionIds) {
      const alive = await this.redis.exists(
        redisKeys.presenceSession(sessionId),
      );

      if (!alive) {
        const client = this.redis.getClient();

        await client.sRem(redisKeys.presenceUserSessions(userId), sessionId);
      }
    }
  }

  private async commitUserPresence(
    userId: string,
    status?: RealtimePresenceStatus,
    privacy?: RealtimePresencePrivacy,
  ): Promise<RealtimeUserPresence> {
    const sessionCount = await this.getSessionCount(userId);

    const presence: RealtimeUserPresence = {
      userId,
      status:
        status ?? (sessionCount > 0
          ? RealtimePresenceStatus.ONLINE
          : RealtimePresenceStatus.OFFLINE),
      lastSeen: Date.now(),
      sessionCount,
      privacy: privacy
        ? this.normalizePrivacy(privacy)
        : this.normalizePrivacy(undefined),
    };

    await this.redis.set(
      redisKeys.presenceUser(userId),
      JSON.stringify(presence),
      REDIS_TTL.SESSION_PRESENCE,
    );

    return presence;
  }

  private async getCachedUserPresence(
    userId: string,
  ): Promise<RealtimeUserPresence | null> {
    const raw = await this.redis.get(redisKeys.presenceUser(userId));

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as RealtimeUserPresence;

      parsed.sessionCount = await this.getSessionCount(userId);

      return parsed;
    } catch (error) {
      this.logger.warn(`Invalid cached presence for user ${userId}`, error);

      return null;
    }
  }
}
