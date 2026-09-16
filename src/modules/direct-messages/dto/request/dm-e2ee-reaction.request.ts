import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

export class DmE2eeReactionRequest {
  @IsString()
  @MaxLength(100)
  channelId: string;

  @IsString()
  @MaxLength(100)
  messageId: string;

  @IsString()
  @MaxLength(100)
  senderDeviceId: string;

  @IsInt()
  @Min(1)
  protocolVersion: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmE2eeEnvelopeDto)
  envelopes: DmE2eeEnvelopeDto[];
}