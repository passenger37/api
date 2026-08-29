import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  OFFLINE = 'OFFLINE',
  DND = 'DND',
  INVISIBLE = 'INVISIBLE',
}

export type PresenceResult = {
  userId: string;
  status: PresenceStatus;
  lastSeen: number | null;
};

export const PRESENCE_ROOM = 'presence';

const PRESENCE_TTL_SECONDS = 60;
const LAST_SEEN_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  async markOnline(userId: string): Promise<PresenceResult> {
    return this.setStatus(userId, PresenceStatus.ONLINE);
  }

  async setStatus(
    userId: string,
    status: PresenceStatus,
  ): Promise<PresenceResult> {
    const presence = {
      status,
      lastSeen: Date.now(),
    };

    await this.redis.set(
      this.presenceKey(userId),
      JSON.stringify(presence),
      PRESENCE_TTL_SECONDS,
    );

    return {
      userId,
      status: presence.status,
      lastSeen: presence.lastSeen,
    };
  }

  async getStatus(userId: string): Promise<PresenceResult> {
    const raw = await this.redis.get(this.presenceKey(userId));

    if (!raw) {
      const lastSeenRaw = await this.redis.get(this.lastSeenKey(userId));

      return {
        userId,
        status: PresenceStatus.OFFLINE,
        lastSeen: lastSeenRaw ? Number(lastSeenRaw) : null,
      };
    }

    try {
      const presence = JSON.parse(raw);

      return {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
      };
    } catch {
      return {
        userId,
        status: PresenceStatus.OFFLINE,
        lastSeen: null,
      };
    }
  }

  async getVisibleStatus(userId: string): Promise<PresenceResult> {
    const presence = await this.getStatus(userId);

    if (presence.status === PresenceStatus.INVISIBLE) {
      return {
        ...presence,
        status: PresenceStatus.OFFLINE,
      };
    }

    return presence;
  }

  async touch(userId: string): Promise<void> {
    await this.redis.expire(this.presenceKey(userId), PRESENCE_TTL_SECONDS);
  }

  async markOffline(userId: string): Promise<PresenceResult> {
    const lastSeen = Date.now();

    await this.redis.del(this.presenceKey(userId));
    await this.redis.set(
      this.lastSeenKey(userId),
      String(lastSeen),
      LAST_SEEN_TTL_SECONDS,
    );

    return {
      userId,
      status: PresenceStatus.OFFLINE,
      lastSeen,
    };
  }

  private presenceKey(userId: string) {
    return `user:${userId}:presence`;
  }

  private lastSeenKey(userId: string) {
    return `user:${userId}:last-seen`;
  }
}
