import { UserSummaryResponse } from './user-summary.response';

export type DirectMessageChannelMode = 'STANDARD' | 'PRIVATE_E2EE';

export interface DirectMessageChannelSettingsResponse {
  isMuted: boolean;
  mutedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  isHidden: boolean;
  hiddenAt: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
}

export interface DirectMessageChannelResponse {
  id: string;
  partner: UserSummaryResponse;
  mode: DirectMessageChannelMode;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  settings: DirectMessageChannelSettingsResponse;
}
