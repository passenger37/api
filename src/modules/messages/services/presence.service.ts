import { Injectable } from '@nestjs/common';

import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
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
      redisKeys.presence(userId),
      JSON.stringify(presence),
      REDIS_TTL.PRESENCE,
    );

    return {
      userId,
      status: presence.status,
      lastSeen: presence.lastSeen,
    };
  }

  async getStatus(userId: string): Promise<PresenceResult> {
    const raw = await this.redis.get(redisKeys.presence(userId));

    if (!raw) {
      const lastSeenRaw = await this.redis.get(redisKeys.lastSeen(userId));

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
    await this.redis.expire(redisKeys.presence(userId), REDIS_TTL.PRESENCE);
  }

  async markOffline(userId: string): Promise<PresenceResult> {
    const lastSeen = Date.now();

    await this.redis.del(redisKeys.presence(userId));
    await this.redis.set(
      redisKeys.lastSeen(userId),
      String(lastSeen),
      REDIS_TTL.LAST_SEEN,
    );

    return {
      userId,
      status: PresenceStatus.OFFLINE,
      lastSeen,
    };
  }
}
