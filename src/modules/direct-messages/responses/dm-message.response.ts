export interface DirectMessageAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DirectMessageReactionSummary {
  emoji: string;
  count: number;
  reactedByViewer: boolean;
}

export interface DirectMessageResponse {
  id: string;
  channelId: string;
  authorUserId: string;
  content: string;
  isE2ee: boolean;
  senderDeviceId: string | null;
  protocolVersion: number | null;
  clientMessageId: string | null;
  parentMessageId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  version: number;
  messageSeq: number;
  createdAt: string;
  reactions?: DirectMessageReactionSummary[];
  attachments?: DirectMessageAttachmentSummary[];
}
