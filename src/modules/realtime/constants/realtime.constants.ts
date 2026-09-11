export const REALTIME_EVENT_CHANNEL = 'realtime:events';

export const REALTIME_ROOM = 'realtime';

export const REALTIME_PRESENCE_UPDATE = 'presence:update';
export const REALTIME_PRESENCE_ONLINE = 'presence:online';
export const REALTIME_PRESENCE_OFFLINE = 'presence:offline';
export const REALTIME_TYPING_START = 'typing:start';
export const REALTIME_TYPING_STOP = 'typing:stop';
export const REALTIME_COMMENT_CREATED = 'comment:created';
export const REALTIME_COMMENT_UPDATED = 'comment:updated';
export const REALTIME_COMMENT_DELETED = 'comment:deleted';
export const REALTIME_COMMENT_REACTION = 'comment:reaction';

export const REALTIME_USER_ROOM_PREFIX = 'rt:user';
export const REALTIME_CHANNEL_ROOM_PREFIX = 'rt:channel';
export const REALTIME_POST_ROOM_PREFIX = 'rt:post';

export const realtimeUserRoom = (userId: string): string =>
  `${REALTIME_USER_ROOM_PREFIX}:${userId}`;

export const realtimeChannelRoom = (channelId: string): string =>
  `${REALTIME_CHANNEL_ROOM_PREFIX}:${channelId}`;

export const realtimePostRoom = (postId: string): string =>
  `${REALTIME_POST_ROOM_PREFIX}:${postId}`;

export const REALTIME_WS_RATE_LIMIT = {
  HEARTBEAT: 30,
  SET_PRESENCE: 10,
  GET_PRESENCE: 20,
  PRESENCE_SUBSCRIBE: 30,
  CHANNEL_JOIN: 20,
  POST_JOIN: 20,
  TYPING: 10,
} as const;

export const REALTIME_WINDOW_SECONDS = 10;

export const DEFAULT_PRESENCE_PRIVACY = 'EVERYONE';
