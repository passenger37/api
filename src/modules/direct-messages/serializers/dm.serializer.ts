import {
  DirectMessage,
  DirectMessageChannel,
  DirectMessageChannelSettings,
  DirectMessageReadState,
  DirectMessageAttachment,
  User,
  E2eeAttachment,
} from '@prisma/client';

import {
  DirectMessageChannelResponse,
  DirectMessageReactionSummary,
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
    isE2ee: message.isE2ee,
    senderDeviceId: message.senderDeviceId,
    protocolVersion: message.protocolVersion,
    clientMessageId: message.clientMessageId,
    parentMessageId: message.parentMessageId,
    isEdited: message.isEdited,
    editedAt: message.editedAt?.toISOString() ?? null,
    isDeleted: message.isDeleted,
    version: message.version,
    messageSeq: message.messageSeq,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeReactionSummary(
  countsByEmoji: Map<string, number> | Record<string, number>,
  viewerEmojis: Set<string>,
): DirectMessageReactionSummary[] {
  const counts =
    countsByEmoji instanceof Map
      ? countsByEmoji
      : new Map(Object.entries(countsByEmoji));

  return Array.from(counts.entries())
    .map(([emoji, count]) => ({
      emoji,
      count,
      reactedByViewer: viewerEmojis.has(emoji),
    }))
    .sort((a, b) => b.count - a.count);
}

export function serializeAttachments(attachments: DirectMessageAttachment[]) {
  return attachments.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  }));
}

export function serializeDirectMessageChannel(
  channel: ChannelWithUsers,
  viewerUserId: string,
  readState?: DirectMessageReadState | null,
  settings?: DirectMessageChannelSettings | null,
): DirectMessageChannelResponse {
  const partner =
    channel.userA.id === viewerUserId ? channel.userB : channel.userA;

  return {
    id: channel.id,
    partner: serializeUserSummary(partner),
    mode: channel.mode,
    lastMessageAt: channel.lastMessageAt?.toISOString() ?? null,
    unreadCount: readState?.unreadCount ?? 0,
    createdAt: channel.createdAt.toISOString(),
    settings: {
      isMuted: settings?.isMuted ?? false,
      mutedAt: settings?.mutedAt?.toISOString() ?? null,
      isArchived: settings?.isArchived ?? false,
      archivedAt: settings?.archivedAt?.toISOString() ?? null,
      isHidden: settings?.isHidden ?? false,
      hiddenAt: settings?.hiddenAt?.toISOString() ?? null,
      isPinned: settings?.isPinned ?? false,
      pinnedAt: settings?.pinnedAt?.toISOString() ?? null,
    },
  };
}

export function serializeE2eeAttachment(attachment: E2eeAttachment) {
  return {
    id: attachment.id,
    sessionId: attachment.sessionId,
    groupId: attachment.groupId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storageKey: attachment.storageKey,
    encryptedFileKey: attachment.encryptedFileKey,
    encryptedThumbnailKey: attachment.encryptedThumbnailKey,
    thumbnailStorageKey: attachment.thumbnailStorageKey,
    thumbnailMimeType: attachment.thumbnailMimeType,
    thumbnailSizeBytes: attachment.thumbnailSizeBytes,
    fileHash: attachment.fileHash,
    thumbnailHash: attachment.thumbnailHash,
    status: attachment.status,
    uploadError: attachment.uploadError,
    messageId: attachment.messageId,
    senderDeviceId: attachment.senderDeviceId,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}
