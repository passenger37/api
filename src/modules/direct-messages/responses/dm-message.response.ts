export interface DirectMessageResponse {
  id: string;
  channelId: string;
  authorUserId: string;
  content: string;
  clientMessageId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  version: number;
  messageSeq: number;
  createdAt: string;
}
