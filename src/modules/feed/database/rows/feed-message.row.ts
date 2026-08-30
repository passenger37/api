export interface FeedMessageRow {
  id: string;

  content: string;

  serverId: string;

  channelId: string;

  authorMemberId: string;

  messageSeq: number;

  isPinned: boolean;

  createdAt: Date;
}
