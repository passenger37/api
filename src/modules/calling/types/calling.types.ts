export enum CallType {
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
}

export enum CallScope {
  DM = 'DM',
  GROUP = 'GROUP',
  SERVER_CHANNEL = 'SERVER_CHANNEL',
  COMMUNITY = 'COMMUNITY',
}

export enum CallStatus {
  CREATED = 'CREATED',
  RINGING = 'RINGING',
  ACCEPTED = 'ACCEPTED',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum CallParticipantState {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  MUTED = 'MUTED',
  CAMERA_OFF = 'CAMERA_OFF',
}

export type CallParticipantWithUser = {
  id: string;
  userId: string;
  deviceId: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  state: CallParticipantState;
  user?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};
