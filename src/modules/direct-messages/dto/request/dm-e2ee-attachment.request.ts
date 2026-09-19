import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { E2eeEnvelopeType } from '@prisma/client';

export class DmE2eeEnvelopeDto {
  @IsString()
  @MaxLength(100)
  recipientDeviceId: string;

  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsEnum(E2eeEnvelopeType)
  type: E2eeEnvelopeType;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  ciphertext: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  protocolVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  associatedData?: string;
}

export class DmE2eeAttachmentDto {
  @IsString()
  @Min(1)
  @Max(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  sizeBytes: number;

  @IsString()
  @Min(1)
  encryptedFileKey: string;

  @IsString()
  @Min(1)
  fileHash: string;

  @IsOptional()
  @IsString()
  @Min(1)
  encryptedThumbnailKey?: string;

  @IsOptional()
  @IsString()
  thumbnailHash?: string;

  @IsOptional()
  @IsString()
  thumbnailMimeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5 * 1024 * 1024) // 5MB max for thumbnail
  thumbnailSizeBytes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmE2eeEnvelopeDto)
  envelopes: DmE2eeEnvelopeDto[];
}

export class DmE2eeSendAttachmentRequest {
  @IsString()
  @MaxLength(100)
  channelId: string;

  @IsString()
  @MaxLength(100)
  senderDeviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;

  @IsInt()
  @Min(1)
  protocolVersion: number;

  @ValidateNested()
  attachment: DmE2eeAttachmentDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmE2eeEnvelopeDto)
  envelopes?: DmE2eeEnvelopeDto[]; // Optional additional message envelopes (e.g., caption)
}
