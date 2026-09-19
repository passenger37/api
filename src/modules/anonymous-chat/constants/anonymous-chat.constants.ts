import { AnonymousChatReportReason } from '../types/anonymous-chat.types';

// =====================================================
// Socket.IO namespace + channel names
// =====================================================

export const ANONYMOUS_CHAT_NAMESPACE = '/anonymous';

export const ANONYMOUS_EVENT_JOIN_QUEUE = 'anonymous:join-queue';
export const ANONYMOUS_EVENT_LEAVE_QUEUE = 'anonymous:leave-queue';
export const ANONYMOUS_EVENT_MESSAGE = 'anonymous:message';
export const ANONYMOUS_EVENT_TYPING = 'anonymous:typing';
export const ANONYMOUS_EVENT_SKIP = 'anonymous:skip';
export const ANONYMOUS_EVENT_END = 'anonymous:end';
export const ANONYMOUS_EVENT_REPORT = 'anonymous:report';
export const ANONYMOUS_EVENT_BLOCK = 'anonymous:block';
export const ANONYMOUS_EVENT_HEARTBEAT = 'anonymous:heartbeat';

export const ANONYMOUS_EVENT_QUEUED = 'anonymous:queued';
export const ANONYMOUS_EVENT_MATCHED = 'anonymous:matched';
export const ANONYMOUS_EVENT_PEER_DISCONNECTED = 'anonymous:peer-disconnected';
export const ANONYMOUS_EVENT_PEER_RECONNECTED = 'anonymous:peer-reconnected';
export const ANONYMOUS_EVENT_ENDED = 'anonymous:ended';

// =====================================================
// Rate limits (per user, sliding-ish via Redis INCR window)
// =====================================================

export const ANONYMOUS_CHAT_WS_RATE_LIMIT = {
  JOIN_QUEUE: 10,
  LEAVE_QUEUE: 10,
  MESSAGE: 20,
  TYPING: 15,
  SKIP: 6,
  END: 6,
  REPORT: 5,
  BLOCK: 5,
  HEARTBEAT: 12,
} as const;

export const ANONYMOUS_CHAT_WINDOW_SECONDS = 10;
export const ANONYMOUS_CHAT_TAU_WINDOW_SECONDS = 600;

// =====================================================
// TTLs and sizes
// =====================================================

/** How long a WAITING session may sit in the queue before auto-expiry. */
export const ANONYMOUS_SESSION_QUEUE_TTL_SECONDS = 120;

/** Max age of an active anonymous session before it is force-expired. */
export const ANONYMOUS_SESSION_MAX_TTL_SECONDS = 30 * 60;

/** Presence heartbeat TTL (client must heartbeat within this window). */
export const ANONYMOUS_PRESENCE_TTL_SECONDS = 60;

/** Grace window a disconnected participant gets before the room is closed. */
export const ANONYMOUS_DISCONNECT_GRACE_SECONDS = 30;

/** How often the cleanup sweep runs. */
export const ANONYMOUS_CLEANUP_INTERVAL_SECONDS = 10;

/** Persisted block relationship TTL on the Redis side. */
export const ANONYMOUS_BLOCK_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Typing indicator TTL - never persisted. */
export const ANONYMOUS_TYPING_TTL_SECONDS = 5;

// =====================================================
// Skip cooldown policy - "skip #1 -> allowed ... excessive -> cooldown"
// =====================================================

/** Skips counted within SKIP_WINDOW. */
export const ANONYMOUS_SKIP_WINDOW_SECONDS = 300;
export const ANONYMOUS_SKIP_LIMIT = 3;
export const ANONYMOUS_SKIP_COOLDOWN_SECONDS = 15 * 60;

/** Report spam window + threshold. */
export const ANONYMOUS_REPORT_WINDOW_SECONDS = 600;
export const ANONYMOUS_REPORT_LIMIT = 3;

/** Same-content message spam window + threshold. */
export const ANONYMOUS_SPAM_WINDOW_SECONDS = 30;
export const ANONYMOUS_SPAM_LIMIT = 4;

// =====================================================
// Content limits
// =====================================================

export const ANONYMOUS_MAX_MESSAGE_LENGTH = 2000;
export const ANONYMOUS_MAX_TOPIC_LENGTH = 32;
export const ANONYMOUS_MAX_REPORT_DETAIL_LENGTH = 2000;

/** Report reasons that immediately terminate the session. */
export const ANONYMOUS_HIGH_RISK_REPORT_REASONS: AnonymousChatReportReason[] = [
  AnonymousChatReportReason.MINOR_SAFETY,
  AnonymousChatReportReason.ILLEGAL_CONTENT,
  AnonymousChatReportReason.SELF_HARM,
  AnonymousChatReportReason.THREAT,
  AnonymousChatReportReason.SEXUAL_CONTENT,
];

export const ANONYMOUS_ALLOWED_REPORT_REASONS: AnonymousChatReportReason[] =
  Object.values(AnonymousChatReportReason);

// =====================================================
// Anonymous identity palette + helpers
// =====================================================

export const ANONYMOUS_COLOR_PALETTE = [
  '#7C3AED',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#4F46E5',
] as const;

export const ANONYMOUS_AVATAR_EMOJIS = [
  'animal',
  'cape',
  'cloud',
  'crystal',
  'flame',
  'ghost',
  'leaf',
  'mask',
  'ornament',
  'planet',
  'snow',
  'sparkle',
] as const;

export const anonymousUserRoom = (userId: string): string =>
  `anonymous:user:${userId}`;

export const anonymousRoom = (roomId: string): string =>
  `anonymous:room:${roomId}`;

export const anonymousQueue = (topic: string): string =>
  `anonymous:queue:${topic}`;

export const anonymousQueueTopics = (): string => 'anonymous:queue-topics';

export const anonymousBlockKey = (aUserId: string, bUserId: string): string =>
  `anonymous:block:${aUserId}:${bUserId}`;

export const anonymousPresenceKey = (userId: string): string =>
  `anonymous:presence:${userId}`;

export const anonymousDisconnectKey = (
  roomId: string,
  userId: string,
): string => `anonymous:disconnect:${roomId}:${userId}`;

export const anonymousSkipKey = (userId: string): string =>
  `anonymous:skip:${userId}`;

export const anonymousRestrictionKey = (userId: string): string =>
  `anonymous:restriction:${userId}`;

export const anonymousTypingKey = (roomId: string, userId: string): string =>
  `anonymous:typing:${roomId}:${userId}`;

export const anonymousSpamKey = (
  roomId: string,
  userId: string,
  signature: string,
): string => `anonymous:spam:${roomId}:${userId}:${signature}`;

export const anonymousReportKey = (userId: string): string =>
  `anonymous:report:${userId}`;

export const ANONYMOUS_MATCH_LOCK = 'anonymous:match';
