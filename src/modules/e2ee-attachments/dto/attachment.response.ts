import { E2eeAttachmentStatus } from '@prisma/client';

export class AttachmentResponseDto {
  id!: string;
  sessionId!: string | null;
  groupId!: string | null;
  fileName!: string;
  mimeType!: string;
  sizeBytes!: number;
  storageKey!: string;
  encryptedFileKey!: string;
  encryptedThumbnailKey!: string | null;
  thumbnailStorageKey!: string | null;
  thumbnailMimeType!: string | null;
  thumbnailSizeBytes!: number | null;
  fileHash!: string;
  thumbnailHash!: string | null;
  status!: E2eeAttachmentStatus;
  uploadError!: string | null;
  messageId!: string | null;
  senderDeviceId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CreateAttachmentResponseDto {
  success!: boolean;
  attachment!: AttachmentResponseDto;
  uploadUrl!: string;
}

export class GetAttachmentsResponseDto {
  success!: boolean;
  attachments!: AttachmentResponseDto[];
  nextCursor?: string;
  hasMore!: boolean;
}

export class UploadCompleteResponseDto {
  success!: boolean;
  attachment!: AttachmentResponseDto;
}

export class AddThumbnailResponseDto {
  success!: boolean;
  attachment!: AttachmentResponseDto;
}

export class LinkMessageResponseDto {
  success!: boolean;
  attachment!: AttachmentResponseDto;
}
