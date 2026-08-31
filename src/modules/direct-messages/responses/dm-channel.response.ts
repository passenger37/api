import { UserSummaryResponse } from './user-summary.response';

export interface DirectMessageChannelResponse {
  id: string;
  partner: UserSummaryResponse;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}
