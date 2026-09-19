import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { E2eeAttachmentStatus } from '@prisma/client';

export class CreateAttachmentRequest {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsString()
  @Min(1)
  @Max(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  sizeBytes!: number;

  @IsString()
  @Min(1)
  encryptedFileKey!: string;

  @IsString()
  @Min(1)
  fileHash!: string;

  @IsOptional()
  @IsString()
  encryptedThumbnailKey?: string;

  @IsOptional()
  @IsString()
  thumbnailHash?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsUUID()
  senderDeviceId!: string;
}

export class UploadCompleteRequest {
  @IsUUID()
  attachmentId!: string;
}

export class UploadFailedRequest {
  @IsUUID()
  attachmentId!: string;

  @IsString()
  @MaxLength(500)
  error!: string;
}

export class AddThumbnailRequest {
  @IsUUID()
  attachmentId!: string;

  @IsString()
  @Min(1)
  thumbnailStorageKey!: string;

  @IsString()
  @MaxLength(100)
  thumbnailMimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(5 * 1024 * 1024) // 5MB max for thumbnail
  thumbnailSizeBytes!: number;

  @IsString()
  @Min(1)
  encryptedThumbnailKey!: string;

  @IsString()
  @Min(1)
  thumbnailHash!: string;
}

export class LinkMessageRequest {
  @IsUUID()
  attachmentId!: string;

  @IsUUID()
  messageId!: string;
}

export class GetAttachmentsRequest {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
