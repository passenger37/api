import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import {
  ANONYMOUS_DISCONNECT_GRACE_SECONDS,
  anonymousQueue,
  anonymousQueueTopics,
} from '../constants/anonymous-chat.constants';
import {
  AnonymousChatRoomRepository,
  AnonymousChatSessionRepository,
} from '../repositories/anonymous-chat.repository';
import { AnonymousChatMatchmakingService } from './anonymous-chat.matchmaking.service';
import { AnonymousChatSessionService } from './anonymous-chat.session.service';
import { AnonymousChatEndReason } from '../types/anonymous-chat.types';

export interface AnonymousExpiredQueueSession {
  sessionId: string;
  userId: string;
  topic: string;
}

export interface AnonymousClosedRoom {
  roomId: string;
  participantUserIds: string[];
  reason: AnonymousChatEndReason;
}

@Injectable()
export class AnonymousChatCleanupService {
  private readonly logger = new Logger(AnonymousChatCleanupService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly sessionRepo: AnonymousChatSessionRepository,
    private readonly roomRepo: AnonymousChatRoomRepository,
    private readonly sessionService: AnonymousChatSessionService,
    private readonly matchmaking: AnonymousChatMatchmakingService,
  ) {}

  /**
   * Periodic sweep:
   *  1. expire WAITING sessions that sat in the queue too long,
   *  2. close ACTIVE rooms whose participant disconnect grace lapsed,
   *  3. re-run matchmaking for queued stragglers.
   */
  async sweep(now = new Date()): Promise<{
    expiredSessions: AnonymousExpiredQueueSession[];
    closedRooms: AnonymousClosedRoom[];
  }> {
    const expiredSessions = await this.expireQueueSessions(now);
    const closedRooms = await this.closeStaleDisconnects(now);
    await this.retryMatchmaking();

    return { expiredSessions, closedRooms };
  }

  private async expireQueueSessions(
    now: Date,
  ): Promise<AnonymousExpiredQueueSession[]> {
    const stale = await this.sessionRepo.expireStale(now);
    const expired: AnonymousExpiredQueueSession[] = [];

    for (const session of stale) {
      try {
        await this.sessionRepo.markExpired(session.id);
        await this.redis
          .getClient()
          .lRem(anonymousQueue(session.topic), 1, session.id);
        expired.push({
          sessionId: session.id,
          userId: session.userId,
          topic: session.topic,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to expire anonymous queue session ${session.id}.`,
          error,
        );
      }
    }

    return expired;
  }

  private async closeStaleDisconnects(
    now: Date,
  ): Promise<AnonymousClosedRoom[]> {
    const graceBefore = new Date(
      now.getTime() - ANONYMOUS_DISCONNECT_GRACE_SECONDS * 1000,
    );
    const rooms =
      await this.roomRepo.findActiveRoomsWithStaleDisconnects(graceBefore);
    const closed: AnonymousClosedRoom[] = [];

    for (const room of rooms) {
      try {
        await this.sessionService.closeRoom(
          room.id,
          AnonymousChatEndReason.DISCONNECT,
        );
        closed.push({
          roomId: room.id,
          participantUserIds: room.AnonymousChatParticipant.map(
            (participant) => participant.userId,
          ),
          reason: AnonymousChatEndReason.DISCONNECT,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to close stale anonymous room ${room.id}.`,
          error,
        );
      }
    }

    return closed;
  }

  private async retryMatchmaking(): Promise<void> {
    const topics = await this.redis
      .getClient()
      .sMembers(anonymousQueueTopics());
    for (const topic of topics) {
      try {
        await this.matchmaking.attemptMatch(topic);
      } catch (error) {
        this.logger.warn(
          `Anonymous matchmaking retry failed for topic ${topic}.`,
          error,
        );
      }
    }
  }
}
