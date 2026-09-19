import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { anonymousRoom } from '../constants/anonymous-chat.constants';
import {
  anonymousNotFound,
  anonymousChatClosed,
} from '../exceptions/anonymous-chat.exception';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import {
  AnonymousChatParticipantRepository,
  AnonymousChatRoomRepository,
  AnonymousChatSessionRepository,
} from '../repositories/anonymous-chat.repository';
import {
  AnonymousChatEndReason,
  AnonymousChatRoomStatus,
  AnonymousChatSessionStatus,
  AnonymousRoomCache,
} from '../types/anonymous-chat.types';

/**
 * Owns the durable session lifecycle and room state machine. Client sessions
 * are created WAITING, promoted to MATCHED once a room exists, and the room is
 * ACTIVE until closed with an explicit terminal reason.
 */
@Injectable()
export class AnonymousChatSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessionRepo: AnonymousChatSessionRepository,
    private readonly roomRepo: AnonymousChatRoomRepository,
    private readonly participantRepo: AnonymousChatParticipantRepository,
    private readonly mapper: AnonymousMapper,
  ) {}

  /** The user's latest engaged (WAITING or MATCHED) session, if any. */
  async findEngagedSession(userId: string) {
    return this.sessionRepo.findEngagedByUser(userId);
  }

  async createQueueSession(
    userId: string,
    topic: string,
    expiresAt: Date,
  ): Promise<{ sessionId: string }> {
    const session = await this.sessionRepo.create({
      id: randomUUID(),
      userId,
      topic,
      status: AnonymousChatSessionStatus.WAITING,
      expiresAt,
      updatedAt: new Date(),
    });
    return { sessionId: session.id };
  }

  /**
   * Cancels a WAITING queue session (user left the queue before matching).
   */
  async closeQueueSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw anonymousNotFound();
    if (session.status !== AnonymousChatSessionStatus.WAITING) return;

    await this.sessionRepo.markCancelled(sessionId);
  }

  /**
   * Closes an ACTIVE room and cancels both participant sessions.
   * Idempotent: already-closed rooms are reported as such.
   */
  async closeRoom(
    roomId: string,
    reason: AnonymousChatEndReason,
    endedByUserId?: string,
  ): Promise<{ roomId: string; sessionIds: string[] }> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) throw anonymousNotFound();

    if (room.status === AnonymousChatRoomStatus.CLOSED) {
      throw anonymousChatClosed();
    }

    const { sessionIds } = await this.prisma.$transaction(async (tx) => {
      await this.roomRepo.close(
        roomId,
        { endReason: reason, endedByUserId: endedByUserId ?? null },
        tx,
      );

      const participants = await this.participantRepo.findByRoomId(roomId, tx);
      const ids: string[] = [];
      for (const participant of participants) {
        ids.push(participant.sessionId);
        await this.sessionRepo.markCancelled(participant.sessionId, tx);
      }
      return { sessionIds: ids };
    });

    // Drop the Redis room cache so stale state cannot leak.
    await this.redis.del(anonymousRoom(roomId));

    return { roomId, sessionIds };
  }

  /** The ACTIVE room a user belongs to, with both participant views (DB read). */
  async resolveActiveRoomByUser(userId: string): Promise<{
    roomId: string;
    topic: string;
    participants: ReturnType<AnonymousMapper['toParticipantView']>[];
  } | null> {
    const active = await this.participantRepo.findActiveRoomByUser(userId);
    if (!active) return null;

    const participants = await this.participantRepo.findByRoomId(
      active.room.id,
    );
    return {
      roomId: active.room.id,
      topic: active.room.topic,
      participants: this.mapper.toParticipantViews(participants),
    };
  }

  /** The ACTIVE room id for a session (used by the gateway to scope events). */
  async resolveActiveRoomBySessionId(
    sessionId: string,
  ): Promise<{ roomId: string; topic: string } | null> {
    const info = await this.participantRepo.findRoomInfoBySessionId(sessionId);
    if (!info || info.room.status !== AnonymousChatRoomStatus.ACTIVE)
      return null;
    return { roomId: info.room.id, topic: info.room.topic };
  }

  /** Redis-backed room lookup used by the query layer for fast membership checks. */
  async getRoomCache(roomId: string): Promise<AnonymousRoomCache | null> {
    const raw = await this.redis.get(anonymousRoom(roomId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AnonymousRoomCache;
    } catch {
      return null;
    }
  }
}
