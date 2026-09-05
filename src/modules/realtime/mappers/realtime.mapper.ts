import {
  RealtimeSessionInfo,
  RealtimeTypingState,
  RealtimeUserPresence,
} from '../types/realtime.types';

export const serializeSession = (
  session: RealtimeSessionInfo,
): RealtimeSessionInfo => ({
  sessionId: session.sessionId,
  userId: session.userId,
  lastSeen: session.lastSeen,
  ...(session.device ? { device: session.device } : {}),
});

export const serializeUserPresence = (
  presence: RealtimeUserPresence,
): RealtimeUserPresence => ({
  userId: presence.userId,
  status: presence.status,
  lastSeen: presence.lastSeen,
  sessionCount: presence.sessionCount,
  ...(presence.privacy ? { privacy: presence.privacy } : {}),
});

export const serializeTypingState = (
  state: RealtimeTypingState,
): RealtimeTypingState => ({
  channelId: state.channelId,
  userId: state.userId,
});
