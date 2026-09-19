import { Injectable } from '@nestjs/common';

import {
  AnonymousChatMessage,
  AnonymousChatParticipant,
  AnonymousChatRoom,
} from '@prisma/client';
import {
  AnonymousParticipantView,
  AnonymousPublicProfile,
  AnonymousRoomCache,
} from '../types/anonymous-chat.types';

/**
 * Maps durable entities into client-safe views. Only anonymous identity
 * fields ever leave the module — real user fields are never projected.
 */
@Injectable()
export class AnonymousMapper {
  toParticipantView(
    participant: AnonymousChatParticipant,
  ): AnonymousParticipantView {
    return {
      participantId: participant.id,
      userId: participant.userId,
      anonId: participant.anonId,
      displayId: participant.displayId,
      displayColor: participant.displayColor,
      avatarEmoji: participant.avatarEmoji,
    };
  }

  /**
   * Public profile for the peer: strips the user id, anon id and participant
   * id so nothing traceable is ever sent over the wire.
   */
  toPublicProfile(
    participant: AnonymousParticipantView,
  ): AnonymousPublicProfile {
    return {
      displayId: participant.displayId,
      displayColor: participant.displayColor,
      avatarEmoji: participant.avatarEmoji,
    };
  }

  toParticipantViews(
    participants: AnonymousChatParticipant[],
  ): AnonymousParticipantView[] {
    return participants.map((participant) =>
      this.toParticipantView(participant),
    );
  }

  toRoomCache(
    room: AnonymousChatRoom,
    participants: AnonymousParticipantView[],
    lastMessageAt: Date | null,
  ): AnonymousRoomCache {
    return {
      id: room.id,
      topic: room.topic,
      status: room.status,
      participants,
      lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
    };
  }

  /** Message payload for the peer — assumes the peer already knows the sender's display id. */
  toMessageView(
    message: AnonymousChatMessage,
    senderDisplayId: string,
  ): {
    messageId: string;
    anonymousDisplayId: string;
    content: string;
    createdAt: string;
  } {
    return {
      messageId: message.id,
      anonymousDisplayId: senderDisplayId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /** Message ack for the sender, decoupled from DB ids where possible. */
  toMessageAck(
    message: AnonymousChatMessage,
    clientMessageId: string | null,
  ): {
    clientMessageId: string | null;
    messageId: string;
    createdAt: string;
  } {
    return {
      clientMessageId,
      messageId: message.id,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
