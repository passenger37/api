import type { FeedItemResponse } from '../dto/response/feed.response';

export class FeedMapper {
  static toItem(message: {
    id: string;

    content: string;

    createdAt: Date;

    messageSeq: number;

    isPinned: boolean;

    author?: {
      user?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      } | null;
    } | null;

    channel?: {
      id: string;
      name: string;
      server?: {
        id: string;
        name: string;
      } | null;
    } | null;
  }): FeedItemResponse {
    return {
      id: message.id,

      content: message.content,

      createdAt: message.createdAt,

      messageSeq: message.messageSeq,

      isPinned: message.isPinned,

      serverId: message.channel?.server?.id ?? '',

      serverName: message.channel?.server?.name ?? '',

      channelId: message.channel?.id ?? '',

      channelName: message.channel?.name ?? '',

      authorId: message.author?.user?.id ?? '',

      authorUsername: message.author?.user?.username ?? '',

      authorDisplayName: message.author?.user?.displayName ?? '',

      authorAvatarUrl: message.author?.user?.avatarUrl ?? null,
    };
  }
}
