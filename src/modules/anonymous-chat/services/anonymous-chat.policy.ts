import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import { anonymousRestrictionKey } from '../constants/anonymous-chat.constants';
import {
  anonymousNotAllowed,
  anonymousAlreadyActive,
  anonymousNotParticipant,
} from '../exceptions/anonymous-chat.exception';
import {
  AnonymousChatParticipantRepository,
  AnonymousChatSessionRepository,
} from '../repositories/anonymous-chat.repository';

/**
 * Server-authoritative authorization for anonymous chat. Nothing the client
 * claims (session ids, peer ids, permissions) is trusted here or below.
 */
@Injectable()
export class AnonymousChatPolicy {
  constructor(
    private readonly sessionRepo: AnonymousChatSessionRepository,
    private readonly participantRepo: AnonymousChatParticipantRepository,
    private readonly redis: RedisService,
  ) {}

  /** Restriction flag set by abuse controls (cooldowns / temp bans). */
  async isRestricted(userId: string): Promise<boolean> {
    return this.redis.exists(anonymousRestrictionKey(userId));
  }

  async assertUserAllowed(userId: string): Promise<void> {
    if (await this.isRestricted(userId)) {
      throw anonymousNotAllowed();
    }
  }

  /**
   * One active queue position per account. A WAITING session is allowed
   * (idempotent re-join); a MATCHED session is not.
   */
  async assertCanJoin(userId: string): Promise<void> {
    await this.assertUserAllowed(userId);

    const engaged = await this.sessionRepo.findEngagedByUser(userId);
    if (engaged?.status === 'MATCHED') {
      throw anonymousAlreadyActive();
    }
  }

  /**
   * Resolves the participant row linking this user to the session and throws
   * when the user is not a member. Reused by every room-scoped event.
   */
  async assertParticipant(
    userId: string,
    sessionId: string,
  ): Promise<{ id: string; sessionId: string; roomId: string }> {
    const participant = await this.participantRepo.findBySessionId(sessionId);
    if (!participant || participant.userId !== userId) {
      throw anonymousNotParticipant();
    }
    return {
      id: participant.id,
      sessionId: participant.sessionId,
      roomId: participant.roomId,
    };
  }
}
