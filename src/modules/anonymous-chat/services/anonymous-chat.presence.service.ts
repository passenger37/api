import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import {
  ANONYMOUS_DISCONNECT_GRACE_SECONDS,
  ANONYMOUS_PRESENCE_TTL_SECONDS,
  ANONYMOUS_SESSION_MAX_TTL_SECONDS,
  anonymousDisconnectKey,
  anonymousPresenceKey,
  anonymousRoom,
} from '../constants/anonymous-chat.constants';
import {
  AnonymousChatParticipantRepository,
  AnonymousChatRoomRepository,
} from '../repositories/anonymous-chat.repository';

@Injectable()
export class AnonymousChatPresenceService {
  constructor(
    private readonly redis: RedisService,
    private readonly participantRepo: AnonymousChatParticipantRepository,
    private readonly roomRepo: AnonymousChatRoomRepository,
  ) {}

  /** Heartbeat — refreshes the presence key and the room cache TTL. */
  async touch(userId: string, roomId?: string): Promise<void> {
    await this.redis.set(
      anonymousPresenceKey(userId),
      'online',
      ANONYMOUS_PRESENCE_TTL_SECONDS,
    );

    if (roomId) {
      await this.touchRoom(roomId);
    }
  }

  async touchRoom(roomId: string): Promise<void> {
    const raw = await this.redis.get(anonymousRoom(roomId));
    if (!raw) return;
    await this.redis.set(
      anonymousRoom(roomId),
      raw,
      ANONYMOUS_SESSION_MAX_TTL_SECONDS,
    );
  }

  /**
   * Marks the user as disconnected in their active room (if any) and opens a
   * short grace window before the cleanup sweep can close the room.
   * Returns the peer's user id so the gateway can notify them.
   */
  async onDisconnect(
    userId: string,
  ): Promise<{ roomId: string; peerUserId: string } | null> {
    const active = await this.participantRepo.findActiveRoomByUser(userId);
    if (!active) return null;

    await this.participantRepo.markDisconnected(
      active.participant.id,
      new Date(),
    );

    await this.redis.set(
      anonymousDisconnectKey(active.room.id, userId),
      '1',
      ANONYMOUS_DISCONNECT_GRACE_SECONDS,
    );
    await this.redis.del(anonymousPresenceKey(userId));

    const peers = (
      await this.participantRepo.findByRoomId(active.room.id)
    ).filter((participant) => participant.userId !== userId);

    if (peers.length === 0) return null;

    return { roomId: active.room.id, peerUserId: peers[0].userId };
  }

  /**
   * Clears the disconnect state when the user comes back during the grace
   * window so the session continues.
   */
  async onReconnect(
    userId: string,
  ): Promise<{ roomId: string; peerUserId: string } | null> {
    const active = await this.participantRepo.findActiveRoomByUser(userId);
    if (!active) return null;

    await this.participantRepo.markConnected(active.participant.id);
    await this.redis.del(anonymousDisconnectKey(active.room.id, userId));
    await this.touch(userId, active.room.id);

    const peers = (
      await this.participantRepo.findByRoomId(active.room.id)
    ).filter((participant) => participant.userId !== userId);

    if (peers.length === 0) return null;

    return { roomId: active.room.id, peerUserId: peers[0].userId };
  }

  /** Whether a participant's presence key has lapsed (crash backstop). */
  async isPresenceExpired(userId: string): Promise<boolean> {
    return !(await this.redis.exists(anonymousPresenceKey(userId)));
  }
}
