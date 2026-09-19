import {
  AnonymousChatRoomStatus,
  AnonymousChatSessionStatus,
} from '@prisma/client';

export {
  AnonymousChatEndReason,
  AnonymousChatRoomStatus,
  AnonymousChatReportStatus,
  AnonymousChatSessionStatus,
} from '@prisma/client';

/**
 * Reasons a participant can report. Mirrors the doc's high-risk taxonomy.
 * High-risk reasons immediately terminate the session.
 */
export enum AnonymousChatReportReason {
  HARASSMENT = 'HARASSMENT',
  SEXUAL_CONTENT = 'SEXUAL_CONTENT',
  MINOR_SAFETY = 'MINOR_SAFETY',
  HATE = 'HATE',
  THREAT = 'THREAT',
  SPAM = 'SPAM',
  SCAM = 'SCAM',
  ILLEGAL_CONTENT = 'ILLEGAL_CONTENT',
  SELF_HARM = 'SELF_HARM',
  OTHER = 'OTHER',
}

export enum AnonymousChatErrorCode {
  NOT_ALLOWED = 'ANONYMOUS_NOT_ALLOWED',
  ALREADY_ACTIVE = 'ANONYMOUS_ALREADY_ACTIVE',
  QUEUE_RATE_LIMITED = 'ANONYMOUS_QUEUE_RATE_LIMITED',
  SESSION_NOT_FOUND = 'ANONYMOUS_SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'ANONYMOUS_SESSION_EXPIRED',
  NOT_PARTICIPANT = 'ANONYMOUS_NOT_PARTICIPANT',
  MESSAGE_RATE_LIMITED = 'ANONYMOUS_MESSAGE_RATE_LIMITED',
  MESSAGE_TOO_LARGE = 'ANONYMOUS_MESSAGE_TOO_LARGE',
  MATCH_UNAVAILABLE = 'ANONYMOUS_MATCH_UNAVAILABLE',
  RECONNECT_EXPIRED = 'ANONYMOUS_RECONNECT_EXPIRED',
  REPORT_RATE_LIMITED = 'ANONYMOUS_REPORT_RATE_LIMITED',
  SKIP_COOLDOWN = 'ANONYMOUS_SKIP_COOLDOWN',
  BLOCK_RATE_LIMITED = 'ANONYMOUS_BLOCK_RATE_LIMITED',
  CHAT_CLOSED = 'ANONYMOUS_CHAT_CLOSED',
}

/**
 * A temporary, session-scoped anonymous display identity. Never derived from
 * the user's real account so peers can only ever see the random handle.
 */
export interface AnonymousIdentity {
  anonId: string;
  displayId: string;
  displayColor: string;
  avatarEmoji: string | null;
}

export interface AnonymousParticipantView {
  participantId: string;
  userId: string;
  anonId: string;
  displayId: string;
  displayColor: string;
  avatarEmoji: string | null;
}

/**
 * Client-safe profile that may be sent to the peer. Deliberately excludes
 * `userId`, `anonId` and any session internals (privacy requirement).
 */
export interface AnonymousPublicProfile {
  displayId: string;
  displayColor: string;
  avatarEmoji: string | null;
}

export interface AnonymousRoomCache {
  id: string;
  topic: string;
  status: AnonymousChatRoomStatus;
  participants: AnonymousParticipantView[];
  lastMessageAt: string | null;
}

export interface AnonymousQueuedResult {
  sessionId: string;
  status: AnonymousChatSessionStatus;
  identity: AnonymousIdentity;
  topic: string;
  matched?: AnonymousMatchedResult;
}

export interface AnonymousMatchedResult {
  roomId: string;
  topic: string;
  self: AnonymousPublicProfile;
  peer: AnonymousPublicProfile;
  matchedAt: string;
}

/** Server-side outcome of a successful match (both participants). */
export interface AnonymousMatchOutcome {
  roomId: string;
  topic: string;
  matchedAt: string;
  aUserId: string;
  aSessionId: string;
  bUserId: string;
  bSessionId: string;
  a: AnonymousParticipantView;
  b: AnonymousParticipantView;
}
