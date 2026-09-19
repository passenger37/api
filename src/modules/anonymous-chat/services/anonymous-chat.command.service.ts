import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import {
  ANONYMOUS_BLOCK_TTL_SECONDS,
  ANONYMOUS_HIGH_RISK_REPORT_REASONS,
  ANONYMOUS_SESSION_QUEUE_TTL_SECONDS,
  anonymousBlockKey,
  anonymousTypingKey,
} from '../constants/anonymous-chat.constants';
import {
  anonymousChatClosed,
  AnonymousChatException,
} from '../exceptions/anonymous-chat.exception';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import {
  AnonymousChatBanRepository,
  AnonymousChatMessageRepository,
  AnonymousChatParticipantRepository,
  AnonymousChatReportRepository,
} from '../repositories/anonymous-chat.repository';
import {
  AnonymousChatEndReason,
  AnonymousChatErrorCode,
  AnonymousChatReportReason,
  AnonymousChatSessionStatus,
  AnonymousIdentity,
  AnonymousMatchOutcome,
} from '../types/anonymous-chat.types';
import { AnonymousChatMatchmakingService } from './anonymous-chat.matchmaking.service';
import { AnonymousChatPolicy } from './anonymous-chat.policy';
import { AnonymousChatPresenceService } from './anonymous-chat.presence.service';
import { AnonymousChatQueryService } from './anonymous-chat.query.service';
import { AnonymousChatRateLimitService } from './anonymous-chat.rate-limit.service';
import { AnonymousChatSafetyService } from './anonymous-chat.safety.service';
import { AnonymousChatSessionService } from './anonymous-chat.session.service';

export interface AnonymousJoinQueueResult {
  sessionId: string;
  topic: string;
  identity: AnonymousIdentity;
  matched?: import('../types/anonymous-chat.types').AnonymousMatchedResult;
  /** Server-side outcome used by the gateway to notify the peer. */
  outcome?: AnonymousMatchOutcome;
}

export interface AnonymousMessageResult {
  status: 'sent' | 'duplicate';
  sessionId: string;
  ack?: {
    clientMessageId: string | null;
    messageId: string;
    createdAt: string;
  };
  peer?: {
    peerUserId: string;
    messageId: string;
    content: string;
    createdAt: string;
  };
  senderDisplayId?: string;
}

export interface AnonymousTypingResult {
  sessionId: string;
  isTyping: boolean;
  peerUserId?: string;
}

export interface AnonymousEndResult {
  roomId: string;
  reason: AnonymousChatEndReason;
  peerUserId?: string;
  requeued?: boolean;
  next?: AnonymousJoinQueueResult;
}

export interface AnonymousReportResult {
  reportId: string;
  terminated: boolean;
  peerUserId?: string;
}

export interface AnonymousBlockResult {
  roomId: string;
  peerUserId?: string;
}

/**
 * Orchestrates the anonymous-chat command surface consumed by the gateway.
 * Rate limits, authorization, safety checks and durable writes all happen
 * here — the gateway stays a thin transport.
 */
@Injectable()
export class AnonymousChatCommandService {
  constructor(
    private readonly redis: RedisService,
    private readonly policy: AnonymousChatPolicy,
    private readonly rateLimit: AnonymousChatRateLimitService,
    private readonly safety: AnonymousChatSafetyService,
    private readonly matchmaking: AnonymousChatMatchmakingService,
    private readonly sessionService: AnonymousChatSessionService,
    private readonly presence: AnonymousChatPresenceService,
    private readonly mapper: AnonymousMapper,
    private readonly participantRepo: AnonymousChatParticipantRepository,
    private readonly messageRepo: AnonymousChatMessageRepository,
    private readonly reportRepo: AnonymousChatReportRepository,
    private readonly banRepo: AnonymousChatBanRepository,
    private readonly queryService: AnonymousChatQueryService,
    private readonly userSocialRepo: UserSocialRepository,
  ) {}

  // =====================================================
  // Queue
  // =====================================================

  async joinQueue(
    userId: string,
    topic = 'general',
  ): Promise<AnonymousJoinQueueResult> {
    await this.rateLimit.assertJoinAllowed(userId);
    await this.policy.assertCanJoin(userId);

    // Idempotent re-join: reuse a still-WAITING session.
    const engaged = await this.sessionService.findEngagedSession(userId);
    if (engaged?.status === AnonymousChatSessionStatus.WAITING) {
      const identity = await this.matchmaking.loadIdentity(userId);
      const outcome = await this.matchmaking.attemptMatch(engaged.topic);
      if (outcome) {
        return this.buildMatchedResult(
          userId,
          engaged.id,
          engaged.topic,
          identity,
          outcome,
        );
      }
      return {
        sessionId: engaged.id,
        topic: engaged.topic,
        identity,
      };
    }

    const identity = this.matchmaking.generateIdentity();
    await this.matchmaking.saveIdentity(userId, identity);

    const expiresAt = new Date(
      Date.now() + ANONYMOUS_SESSION_QUEUE_TTL_SECONDS * 1000,
    );
    const { sessionId } = await this.sessionService.createQueueSession(
      userId,
      topic,
      expiresAt,
    );
    await this.matchmaking.addToQueue(sessionId, topic);

    const outcome = await this.matchmaking.attemptMatch(topic);
    if (outcome) {
      return this.buildMatchedResult(
        userId,
        sessionId,
        topic,
        identity,
        outcome,
      );
    }

    return { sessionId, topic, identity };
  }

  async leaveQueue(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionService.findEngagedSession(userId);
    if (!session || session.id !== sessionId) {
      return; // nothing to leave
    }
    if (session.status === AnonymousChatSessionStatus.WAITING) {
      await this.sessionService.closeQueueSession(session.id);
      await this.matchmaking.removeFromQueue(session.id, session.topic);
    }
  }

  // =====================================================
  // Messaging
  // =====================================================

  async sendMessage(
    userId: string,
    sessionId: string,
    clientMessageId: string,
    content: string,
  ): Promise<AnonymousMessageResult> {
    await this.rateLimit.assertMessageAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    await this.assertRoomActive(membership.roomId);

    const signature = await this.safety.assertSafeToSend(
      userId,
      membership.roomId,
      content,
    );

    const stored = await this.messageRepo.create({
      id: randomUUID(),
      roomId: membership.roomId,
      senderParticipantId: membership.id,
      content,
      clientMessageId,
    });

    // Duplicate clientMessageId: quietly drop the replay.
    if (!stored) {
      return { status: 'duplicate', sessionId };
    }

    void signature;

    const room = await this.sessionService.getRoomCache(membership.roomId);
    const participants = room?.participants ?? [];
    const self = participants.find(
      (participant) => participant.userId === userId,
    );
    const peer = participants.find(
      (participant) => participant.userId !== userId,
    );

    await this.presence.touchRoom(membership.roomId);

    if (!self || !peer) {
      return {
        status: 'sent',
        sessionId,
        ack: this.mapper.toMessageAck(stored, clientMessageId),
      };
    }

    return {
      status: 'sent',
      sessionId,
      ack: this.mapper.toMessageAck(stored, clientMessageId),
      peer: {
        peerUserId: peer.userId,
        messageId: stored.id,
        content: stored.content,
        createdAt: stored.createdAt.toISOString(),
      },
      senderDisplayId: self.displayId,
    };
  }

  async typing(
    userId: string,
    sessionId: string,
    isTyping: boolean,
  ): Promise<AnonymousTypingResult> {
    await this.rateLimit.assertTypingAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    await this.assertRoomActive(membership.roomId);

    const key = anonymousTypingKey(membership.roomId, userId);
    if (isTyping) {
      await this.redis.set(key, '1', 5);
    } else {
      await this.redis.del(key);
    }

    const room = await this.sessionService.getRoomCache(membership.roomId);
    const peer = room?.participants.find(
      (participant) => participant.userId !== userId,
    );

    return { sessionId, isTyping, peerUserId: peer?.userId };
  }

  // =====================================================
  // Skip / End
  // =====================================================

  async skip(userId: string, sessionId: string): Promise<AnonymousEndResult> {
    await this.rateLimit.assertSkipAllowed(userId);
    await this.safety.assertSkipAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    const result = await this.closeRoomSafely(
      membership.roomId,
      AnonymousChatEndReason.NEXT,
      userId,
    );

    const { allowed } = await this.safety.recordSkip(userId);
    if (!allowed) {
      return {
        roomId: membership.roomId,
        reason: AnonymousChatEndReason.NEXT,
        peerUserId: result.peerUserId,
        requeued: false,
      };
    }

    // Return the user to the queue as a fresh session.
    const next = await this.joinQueue(userId, result.topic);
    return {
      roomId: membership.roomId,
      reason: AnonymousChatEndReason.NEXT,
      peerUserId: result.peerUserId,
      requeued: true,
      next,
    };
  }

  async endChat(
    userId: string,
    sessionId: string,
  ): Promise<AnonymousEndResult> {
    await this.rateLimit.assertEndAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    const result = await this.closeRoomSafely(
      membership.roomId,
      AnonymousChatEndReason.NEXT,
      userId,
    );

    return {
      roomId: membership.roomId,
      reason: AnonymousChatEndReason.NEXT,
      peerUserId: result.peerUserId,
    };
  }

  // =====================================================
  // Report / Block / Ban
  // =====================================================

  async report(
    userId: string,
    sessionId: string,
    reason: AnonymousChatReportReason,
    detail?: string,
  ): Promise<AnonymousReportResult> {
    await this.rateLimit.assertReportAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    const room = await this.sessionService.getRoomCache(membership.roomId);
    if (!room || room.status !== 'ACTIVE') {
      throw anonymousChatClosed();
    }

    const self = room.participants.find(
      (participant) => participant.userId === userId,
    );
    const target = room.participants.find(
      (participant) => participant.userId !== userId,
    );
    if (!self || !target) {
      throw anonymousChatClosed();
    }

    const report = await this.reportRepo.create({
      id: randomUUID(),
      roomId: membership.roomId,
      reporterParticipantId: self.participantId,
      targetParticipantId: target.participantId,
      reason,
      detail: detail ?? null,
    });

    const isHighRisk = ANONYMOUS_HIGH_RISK_REPORT_REASONS.includes(reason);

    if (isHighRisk) {
      // Immediate safety workflow: terminate the room and ban the target.
      await this.closeRoomSafely(
        membership.roomId,
        AnonymousChatEndReason.REPORT,
        userId,
      );
      await this.banRepo.create({
        id: randomUUID(),
        userId: target.userId,
        roomId: membership.roomId,
        reason: `auto-ban:${reason}`,
        bannedById: userId,
        expiresAt: null,
      });
    }

    return {
      reportId: report.id,
      terminated: isHighRisk,
      peerUserId: target.userId,
    };
  }

  async block(
    userId: string,
    sessionId: string,
  ): Promise<AnonymousBlockResult> {
    await this.rateLimit.assertBlockAllowed(userId);

    const membership = await this.policy.assertParticipant(userId, sessionId);
    const room = await this.sessionService.getRoomCache(membership.roomId);
    if (!room || room.status !== 'ACTIVE') {
      throw anonymousChatClosed();
    }

    const target = room.participants.find(
      (participant) => participant.userId !== userId,
    );
    if (!target) {
      throw anonymousChatClosed();
    }

    // Permanent repo-level block so the two accounts are never matched again.
    try {
      await this.userSocialRepo.blockUser(userId, target.userId);
    } catch {
      // Already blocked globally — continue with the anonymous-specific state.
    }

    await this.banRepo.create({
      id: randomUUID(),
      userId: target.userId,
      roomId: membership.roomId,
      reason: 'manual-block',
      bannedById: userId,
      expiresAt: null,
    });

    await this.redis.set(
      anonymousBlockKey(userId, target.userId),
      '1',
      ANONYMOUS_BLOCK_TTL_SECONDS,
    );

    await this.closeRoomSafely(
      membership.roomId,
      AnonymousChatEndReason.BLOCK,
      userId,
    );

    return { roomId: membership.roomId, peerUserId: target.userId };
  }

  // =====================================================
  // Presence
  // =====================================================

  async heartbeat(userId: string, sessionId?: string): Promise<void> {
    await this.rateLimit.assertHeartbeatAllowed(userId);

    let roomId: string | undefined;
    if (sessionId) {
      const resolved =
        await this.participantRepo.findRoomInfoBySessionId(sessionId);
      if (resolved?.room.status === 'ACTIVE') {
        roomId = resolved.room.id;
      }
    }

    await this.presence.touch(userId, roomId);
  }

  /** Current state helper shared with the HTTP controller. */
  getCurrentState(userId: string) {
    return this.queryService.getCurrentState(userId);
  }

  // =====================================================
  // Private helpers
  // =====================================================

  private buildMatchedResult(
    userId: string,
    sessionId: string,
    topic: string,
    identity: AnonymousIdentity,
    outcome: AnonymousMatchOutcome,
  ): AnonymousJoinQueueResult {
    const isA = outcome.aUserId === userId;
    const self = isA ? outcome.a : outcome.b;
    const peer = isA ? outcome.b : outcome.a;

    return {
      sessionId,
      topic,
      identity,
      outcome,
      matched: {
        roomId: outcome.roomId,
        topic: outcome.topic,
        self: this.mapper.toPublicProfile(self),
        peer: this.mapper.toPublicProfile(peer),
        matchedAt: outcome.matchedAt,
      },
    };
  }

  private async assertRoomActive(roomId: string): Promise<void> {
    const room = await this.sessionService.getRoomCache(roomId);
    if (!room || room.status !== 'ACTIVE') {
      throw anonymousChatClosed();
    }
  }

  private async closeRoomSafely(
    roomId: string,
    reason: AnonymousChatEndReason,
    userId: string,
  ): Promise<{ peerUserId?: string; topic: string }> {
    const room = await this.sessionService.getRoomCache(roomId);
    const peerUserId = room?.participants.find(
      (participant) => participant.userId !== userId,
    )?.userId;

    try {
      await this.sessionService.closeRoom(roomId, reason, userId);
    } catch (error) {
      const alreadyClosed: readonly string[] = [
        AnonymousChatErrorCode.CHAT_CLOSED,
        AnonymousChatErrorCode.SESSION_NOT_FOUND,
      ];
      if (
        !(
          error instanceof AnonymousChatException &&
          alreadyClosed.includes(error.code)
        )
      ) {
        throw error;
      }
    }

    return { peerUserId, topic: room?.topic ?? 'general' };
  }
}
