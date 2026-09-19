import { randomBytes, randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { RedisLockService } from '../../../core/redis/redis-lock.service';
import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import {
  ANONYMOUS_MATCH_LOCK,
  ANONYMOUS_SESSION_MAX_TTL_SECONDS,
  ANONYMOUS_PRESENCE_TTL_SECONDS,
  ANONYMOUS_AVATAR_EMOJIS,
  ANONYMOUS_COLOR_PALETTE,
  anonymousBlockKey,
  anonymousPresenceKey,
  anonymousQueue,
  anonymousQueueTopics,
  anonymousRoom,
} from '../constants/anonymous-chat.constants';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import {
  AnonymousChatBanRepository,
  AnonymousChatParticipantRepository,
  AnonymousChatRoomRepository,
  AnonymousChatSessionRepository,
} from '../repositories/anonymous-chat.repository';
import {
  AnonymousChatSessionStatus,
  AnonymousIdentity,
  AnonymousMatchOutcome,
  AnonymousRoomCache,
} from '../types/anonymous-chat.types';

const DISPLAY_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ023456789';

@Injectable()
export class AnonymousChatMatchmakingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lock: RedisLockService,
    private readonly sessionRepo: AnonymousChatSessionRepository,
    private readonly roomRepo: AnonymousChatRoomRepository,
    private readonly participantRepo: AnonymousChatParticipantRepository,
    private readonly banRepo: AnonymousChatBanRepository,
    private readonly userSocialRepo: UserSocialRepository,
    private readonly mapper: AnonymousMapper,
  ) {}

  /** Cryptographically-random, session-scoped display identity. */
  generateIdentity(): AnonymousIdentity {
    const anonId = randomUUID();
    const displayId = this.randomDisplayId();
    const displayColor =
      ANONYMOUS_COLOR_PALETTE[
        randomBytes(1)[0] % ANONYMOUS_COLOR_PALETTE.length
      ];
    const avatarEmoji =
      ANONYMOUS_AVATAR_EMOJIS[
        randomBytes(1)[0] % ANONYMOUS_AVATAR_EMOJIS.length
      ];

    return { anonId, displayId, displayColor, avatarEmoji };
  }

  async saveIdentity(
    userId: string,
    identity: AnonymousIdentity,
  ): Promise<void> {
    await this.redis.set(
      `anonymous:user:${userId}`,
      JSON.stringify(identity),
      ANONYMOUS_SESSION_MAX_TTL_SECONDS,
    );
  }

  async loadIdentity(userId: string): Promise<AnonymousIdentity> {
    const raw = await this.redis.get(`anonymous:user:${userId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AnonymousIdentity;
        if (parsed?.displayId && parsed?.anonId) return parsed;
      } catch {
        // fall through to a fresh identity
      }
    }
    return this.generateIdentity();
  }

  async addToQueue(sessionId: string, topic: string): Promise<void> {
    const client = this.redis.getClient();
    await client.lPush(anonymousQueue(topic), sessionId);
    await client.sAdd(anonymousQueueTopics(), topic);
  }

  async removeFromQueue(sessionId: string, topic: string): Promise<void> {
    const client = this.redis.getClient();
    await client.lRem(anonymousQueue(topic), 1, sessionId);
  }

  /**
   * Attempts to match waiting partners for a topic. Runs under a short-lived
   * distributed lock so concurrent API instances can never double-match the
   * same participant.
   */
  async attemptMatch(topic: string): Promise<AnonymousMatchOutcome | null> {
    const { executed, result } = await this.lock.runExclusive(
      `${ANONYMOUS_MATCH_LOCK}:${topic}`,
      5000,
      async () => this.matchWithinLock(topic),
    );

    return executed ? result : null;
  }

  private async matchWithinLock(
    topic: string,
  ): Promise<AnonymousMatchOutcome | null> {
    const client = this.redis.getClient();
    const queueKey = anonymousQueue(topic);
    const topicsKey = anonymousQueueTopics();

    const firstId = await client.rPop(queueKey);
    if (!firstId) return null;

    const secondId = await client.rPop(queueKey);
    if (!secondId) {
      await client.rPush(queueKey, firstId);
      return null;
    }

    // Re-validate both candidates; drop stale queue entries silently.
    const first = await this.validateWaiting(firstId);
    if (!first) {
      await client.rPush(queueKey, secondId);
      return null;
    }

    const second = await this.validateWaiting(secondId);
    if (!second) {
      await client.rPush(queueKey, firstId);
      return null;
    }

    if (await this.areNotMatchable(first.userId, second.userId)) {
      // Requeue both at the tail so a different partner can still match them.
      await client.rPush(queueKey, firstId);
      await client.rPush(queueKey, secondId);
      return null;
    }

    const result = await this.createMatchedRoom(first, second, topic);

    const size = await client.lLen(queueKey);
    if (size === 0) {
      await client.sRem(topicsKey, topic);
    }

    return result;
  }

  private async validateWaiting(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) return null;
    if (session.status !== AnonymousChatSessionStatus.WAITING) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionRepo.markExpired(session.id);
      return null;
    }

    return session;
  }

  /** Blocked pair detection: anonymous blocks, bans and global Nexus blocks. */
  private async areNotMatchable(
    aUserId: string,
    bUserId: string,
  ): Promise<boolean> {
    const client = this.redis.getClient();
    const [aBlockB, bBlockA, bannedA, bannedB, globalAB, globalBA] =
      await Promise.all([
        client.exists(anonymousBlockKey(aUserId, bUserId)),
        client.exists(anonymousBlockKey(bUserId, aUserId)),
        this.banRepo.existsActive(aUserId),
        this.banRepo.existsActive(bUserId),
        this.userSocialRepo.existsBlock(aUserId, bUserId),
        this.userSocialRepo.existsBlock(bUserId, aUserId),
      ]);

    return (
      aBlockB === 1 ||
      bBlockA === 1 ||
      bannedA ||
      bannedB ||
      globalAB ||
      globalBA
    );
  }

  private async createMatchedRoom(
    sessionA: { id: string; userId: string },
    sessionB: { id: string; userId: string },
    topic: string,
  ): Promise<AnonymousMatchOutcome> {
    const roomId = randomUUID();
    const now = new Date();
    const identityA = await this.loadIdentity(sessionA.userId);
    const identityB = await this.loadIdentity(sessionB.userId);

    const room = await this.prisma.$transaction(async (tx) => {
      const created = await this.roomRepo.create(
        { id: roomId, topic, status: 'ACTIVE', updatedAt: now },
        tx,
      );

      const participantA = await this.participantRepo.create(
        {
          id: randomUUID(),
          roomId,
          sessionId: sessionA.id,
          userId: sessionA.userId,
          anonId: identityA.anonId,
          displayId: identityA.displayId,
          displayColor: identityA.displayColor,
          avatarEmoji: identityA.avatarEmoji,
        },
        tx,
      );

      const participantB = await this.participantRepo.create(
        {
          id: randomUUID(),
          roomId,
          sessionId: sessionB.id,
          userId: sessionB.userId,
          anonId: identityB.anonId,
          displayId: identityB.displayId,
          displayColor: identityB.displayColor,
          avatarEmoji: identityB.avatarEmoji,
        },
        tx,
      );

      await this.sessionRepo.markMatched(sessionA.id, roomId, tx);
      await this.sessionRepo.markMatched(sessionB.id, roomId, tx);

      return { created, participantA, participantB };
    });

    const viewA = this.mapper.toParticipantView(room.participantA);
    const viewB = this.mapper.toParticipantView(room.participantB);

    const cache: AnonymousRoomCache = {
      id: roomId,
      topic,
      status: 'ACTIVE',
      participants: [viewA, viewB],
      lastMessageAt: null,
    };

    await Promise.all([
      this.redis.set(
        anonymousRoom(roomId),
        JSON.stringify(cache),
        ANONYMOUS_SESSION_MAX_TTL_SECONDS,
      ),
      this.redis.set(
        anonymousPresenceKey(sessionA.userId),
        'online',
        ANONYMOUS_PRESENCE_TTL_SECONDS,
      ),
      this.redis.set(
        anonymousPresenceKey(sessionB.userId),
        'online',
        ANONYMOUS_PRESENCE_TTL_SECONDS,
      ),
    ]);

    return {
      roomId,
      topic,
      matchedAt: now.toISOString(),
      aUserId: sessionA.userId,
      aSessionId: sessionA.id,
      bUserId: sessionB.userId,
      bSessionId: sessionB.id,
      a: viewA,
      b: viewB,
    };
  }

  private randomDisplayId(): string {
    const bytes = randomBytes(4);
    return Array.from(bytes)
      .map((byte) => DISPLAY_ID_ALPHABET[byte % DISPLAY_ID_ALPHABET.length])
      .join('');
  }
}
