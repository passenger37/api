import { E2eeAttachment, E2eeAttachmentStatus } from '@prisma/client';

export interface AttachmentResponse {
  id: string;
  sessionId: string | null;
  groupId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  encryptedFileKey: string;
  encryptedThumbnailKey: string | null;
  thumbnailStorageKey: string | null;
  thumbnailMimeType: string | null;
  thumbnailSizeBytes: number | null;
  fileHash: string;
  thumbnailHash: string | null;
  status: E2eeAttachmentStatus;
  uploadError: string | null;
  messageId: string | null;
  senderDeviceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeAttachment(attachment: E2eeAttachment): AttachmentResponse {
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
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
  };
}

export function serializeAttachmentList(attachments: E2eeAttachment[]): AttachmentResponse[] {
  return attachments.map(serializeAttachment);
}