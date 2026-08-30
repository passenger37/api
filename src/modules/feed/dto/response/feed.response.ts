export class FeedItemResponse {
  id!: string;

  content!: string;

  createdAt!: Date;

  serverId!: string;

  serverName!: string;

  channelId!: string;

  channelName!: string;

  authorId!: string;

  authorUsername!: string;

  authorDisplayName!: string;

  authorAvatarUrl!: string | null;

  messageSeq!: number;

  isPinned!: boolean;
}

export class FeedResponse {
  items!: FeedItemResponse[];

  nextCursor?: string;

  hasMore!: boolean;
}
