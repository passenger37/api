export enum RealtimePresenceStatus {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  OFFLINE = 'OFFLINE',
  DND = 'DND',
  INVISIBLE = 'INVISIBLE',
}

export enum RealtimePresencePrivacy {
  EVERYONE = 'EVERYONE',
  CONNECTIONS = 'CONNECTIONS',
  SERVER_MEMBERS = 'SERVER_MEMBERS',
  NOBODY = 'NOBODY',
}

export type RealtimeSessionInfo = {
  sessionId: string;
  userId: string;
  lastSeen: number;
  device?: string;
};

export type RealtimeUserPresence = {
  userId: string;
  status: RealtimePresenceStatus;
  lastSeen: number | null;
  sessionCount: number;
  privacy?: RealtimePresencePrivacy;
};

export type RealtimeTypingState = {
  channelId: string;
  userId: string;
};

export enum RealtimeEventType {
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_ONLINE = 'presence:online',
  PRESENCE_OFFLINE = 'presence:offline',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
}

export type RealtimeEventPayload =
  | {
      type: RealtimeEventType.PRESENCE_UPDATE;
      presence: RealtimeUserPresence;
    }
  | {
      type: RealtimeEventType.PRESENCE_ONLINE;
      presence: RealtimeUserPresence;
    }
  | {
      type: RealtimeEventType.PRESENCE_OFFLINE;
      presence: RealtimeUserPresence;
    }
  | {
      type: RealtimeEventType.TYPING_START;
      channelId: string;
      userId: string;
      username?: string;
    }
  | {
      type: RealtimeEventType.TYPING_STOP;
      channelId: string;
      userId: string;
    };
