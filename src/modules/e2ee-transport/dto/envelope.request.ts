import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { E2eeEnvelopeType } from '@prisma/client';

export class SendEnvelopeRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId!: string;

  @IsEnum(E2eeEnvelopeType)
  type!: E2eeEnvelopeType;

  @IsString()
  @MaxLength(10000)
  ciphertext!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  protocolVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  associatedData?: string;

  @IsString()
  @MaxLength(100)
  senderDeviceId!: string;

  @IsString()
  @MaxLength(100)
  recipientDeviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  channelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;
}

export class GetEnvelopesRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId!: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientDeviceId?: string;
}

export class MarkEnvelopeDeliveredDto {
  @IsString()
  @MaxLength(100)
  envelopeId!: string;
}

export class MarkEnvelopeFailedDto {
  @IsString()
  @MaxLength(100)
  envelopeId!: string;

  @IsString()
  @MaxLength(500)
  error!: string;
}
