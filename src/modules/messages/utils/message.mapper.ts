import { ChannelMessage } from '@prisma/client';

type MessageWithAuthor = ChannelMessage & {
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    status?: string;
  }>;
  author?: {
    user?: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  } | null;
};

export function toClientMessage<T extends MessageWithAuthor>(message: T) {
  const user = message.author?.user;

  return {
    id: message.id,
    content: message.content,
    channelId: message.channelId,
    serverId: message.serverId,
    authorMemberId: message.authorMemberId,
    authorUserId: user?.id ?? null,
    author: user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? null,
        }
      : undefined,
    parentMessageId: message.parentMessageId,
    isEdited: message.isEdited,
    editedAt: message.editedAt?.toISOString() ?? null,
    isDeleted: message.isDeleted,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    isPinned: message.isPinned,
    pinnedAt: message.pinnedAt?.toISOString() ?? null,
    clientMessageId: message.clientMessageId,
    version: message.version,
    messageSeq: message.messageSeq,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    attachments: message.attachments ?? [],
  };
}
