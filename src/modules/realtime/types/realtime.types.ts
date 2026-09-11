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
  COMMENT_CREATED = 'comment:created',
  COMMENT_UPDATED = 'comment:updated',
  COMMENT_DELETED = 'comment:deleted',
  COMMENT_REACTION = 'comment:reaction',
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
    }
  | {
      type: RealtimeEventType.COMMENT_CREATED;
      postId: string;
      postType: string;
      commentId: string;
      comment: Record<string, unknown>;
    }
  | {
      type: RealtimeEventType.COMMENT_UPDATED;
      postId: string;
      postType: string;
      commentId: string;
      comment: Record<string, unknown>;
    }
  | {
      type: RealtimeEventType.COMMENT_DELETED;
      postId: string;
      postType: string;
      commentId: string;
      status: string;
    }
  | {
      type: RealtimeEventType.COMMENT_REACTION;
      postId: string;
      postType: string;
      commentId: string;
      vote: string;
      scoreDelta: number;
    };
