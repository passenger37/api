import { Injectable } from '@nestjs/common';

import { AnonymousChatMessageRepository } from '../repositories/anonymous-chat.repository';
import { AnonymousChatMatchmakingService } from './anonymous-chat.matchmaking.service';
import { AnonymousChatSessionService } from './anonymous-chat.session.service';
import { AnonymousParticipantView } from '../types/anonymous-chat.types';

export type AnonymousUserState =
  | { kind: 'idle' }
  | {
      kind: 'queued';
      sessionId: string;
      topic: string;
      queuedAt: string;
      displayId: string;
    }
  | {
      kind: 'active';
      sessionId: string;
      roomId: string;
      topic: string;
      self: AnonymousParticipantView;
      peer: AnonymousParticipantView;
      matchedAt: string;
    };

@Injectable()
export class AnonymousChatQueryService {
  constructor(
    private readonly matchmaking: AnonymousChatMatchmakingService,
    private readonly sessionService: AnonymousChatSessionService,
    private readonly messageRepo: AnonymousChatMessageRepository,
  ) {}

  /** Current anonymous-chat state for a user: idle, queued or in-session. */
  async getCurrentState(userId: string): Promise<AnonymousUserState> {
    const session = await this.sessionService.findEngagedSession(userId);
    if (!session) return { kind: 'idle' };

    if (session.status === 'WAITING') {
      const identity = await this.matchmaking.loadIdentity(userId);
      return {
        kind: 'queued',
        sessionId: session.id,
        topic: session.topic,
        queuedAt: session.createdAt.toISOString(),
        displayId: identity.displayId,
      };
    }

    if (session.status === 'MATCHED' && session.matchedRoomId) {
      const active = await this.sessionService.resolveActiveRoomByUser(userId);
      if (active) {
        const self =
          active.participants.find(
            (participant) => participant.userId === userId,
          ) ?? null;
        const peer =
          active.participants.find(
            (participant) => participant.userId !== userId,
          ) ?? null;
        if (self && peer) {
          return {
            kind: 'active',
            sessionId: session.id,
            roomId: active.roomId,
            topic: active.topic,
            self,
            peer,
            matchedAt: session.updatedAt.toISOString(),
          };
        }
      }
    }

    return { kind: 'idle' };
  }

  async getRecentMessages(roomId: string, limit = 50) {
    return this.messageRepo.findRecentByRoom(roomId, limit);
  }
}
