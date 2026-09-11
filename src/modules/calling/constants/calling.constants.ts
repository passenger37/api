export const CALL_EVENT_CHANNEL = 'calling:events';

export const CALL_ROOM = 'calling';

export const CALL_EVENT_CREATE = 'call:create';
export const CALL_EVENT_RING = 'call:ring';
export const CALL_EVENT_ACCEPT = 'call:accept';
export const CALL_EVENT_REJECT = 'call:reject';
export const CALL_EVENT_CANCEL = 'call:cancel';
export const CALL_EVENT_END = 'call:end';

export const CALL_EVENT_WEBRTC_OFFER = 'webrtc:offer';
export const CALL_EVENT_WEBRTC_ANSWER = 'webrtc:answer';
export const CALL_EVENT_WEBRTC_ICE_CANDIDATE = 'webrtc:ice-candidate';

export const CALL_EVENT_MUTE = 'call:mute';
export const CALL_EVENT_UNMUTE = 'call:unmute';
export const CALL_EVENT_CAMERA_ON = 'call:camera-on';
export const CALL_EVENT_CAMERA_OFF = 'call:camera-off';

export const CALL_EVENT_PARTICIPANT_JOINED = 'call:participant-joined';
export const CALL_EVENT_PARTICIPANT_LEFT = 'call:participant-left';

/** Reconnect/reconciliation resync pushed to a (re)connecting client. */
export const CALL_EVENT_STATE = 'call:state';

export const CALL_WS_RATE_LIMIT = {
  CREATE: 5,
  RING: 10,
  ACCEPT: 5,
  REJECT: 5,
  CANCEL: 5,
  END: 5,
  SIGNAL: 30,
  MUTE: 10,
  CAMERA: 10,
} as const;

/** Live (non-terminal) call statuses — used to scope "active call" lookups. */
export const LIVE_CALL_STATUSES = [
  'CREATED',
  'RINGING',
  'ACCEPTED',
  'CONNECTING',
  'ACTIVE',
] as const;

/** Terminal statuses — used for call history queries. */
export const TERMINAL_CALL_STATUSES = [
  'ENDED',
  'FAILED',
  'REJECTED',
  'CANCELLED',
] as const;

/** Live participant states — a participant row that is still in the session. */
export const LIVE_PARTICIPANT_STATES = ['JOINED', 'MUTED', 'CAMERA_OFF'] as const;

export const CALL_WINDOW_SECONDS = 10;

/** How long a RINGING call may stay unanswered before the cleanup sweep expires it. */
export const CALL_RING_TTL_SECONDS = 60;

/** How often the cleanup sweep runs. */
export const CALL_CLEANUP_INTERVAL_SECONDS = 15;

/** Cluster-wide lifecycle actions published on `calling:events`. */
export type CallLifecycleAction =
  | 'CREATED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ENDED'
  | 'EXPIRED'
  | 'MISSED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT';

export const callRoom = (callId: string): string => `call:${callId}`;
export const callParticipantRoom = (userId: string): string => `call:user:${userId}`;

export const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];