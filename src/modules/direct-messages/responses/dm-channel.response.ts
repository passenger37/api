import { UserSummaryResponse } from './user-summary.response';

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
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  settings: DirectMessageChannelSettingsResponse;
}
