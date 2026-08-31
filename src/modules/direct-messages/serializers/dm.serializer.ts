import {
  DirectMessage,
  DirectMessageChannel,
  DirectMessageReadState,
  User,
} from '@prisma/client';

import {
  DirectMessageChannelResponse,
  DirectMessageResponse,
  UserSummaryResponse,
} from '../responses';

type ChannelWithUsers = DirectMessageChannel & {
  userA: User;
  userB: User;
};

export function serializeUserSummary(user: User): UserSummaryResponse {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

export function serializeDirectMessage(
  message: DirectMessage,
): DirectMessageResponse {
  return {
    id: message.id,
    channelId: message.channelId,
    authorUserId: message.authorUserId,
    content: message.content,
    clientMessageId: message.clientMessageId,
    isEdited: message.isEdited,
    editedAt: message.editedAt?.toISOString() ?? null,
    isDeleted: message.isDeleted,
    version: message.version,
    messageSeq: message.messageSeq,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeDirectMessageChannel(
  channel: ChannelWithUsers,
  viewerUserId: string,
  readState?: DirectMessageReadState | null,
): DirectMessageChannelResponse {
  const partner =
    channel.userA.id === viewerUserId ? channel.userB : channel.userA;

  return {
    id: channel.id,
    partner: serializeUserSummary(partner),
    lastMessageAt: channel.lastMessageAt?.toISOString() ?? null,
    unreadCount: readState?.unreadCount ?? 0,
    createdAt: channel.createdAt.toISOString(),
  };
}
