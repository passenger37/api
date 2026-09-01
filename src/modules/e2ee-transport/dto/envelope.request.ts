import { IsString, IsUUID, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { E2eeEnvelopeType } from '@prisma/client';

export class SendEnvelopeRequestDto {
  @IsUUID()
  sessionId!: string;

  @IsEnum(E2eeEnvelopeType)
  type!: E2eeEnvelopeType;

  @IsString()
  @MaxLength(10000)
  ciphertext!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  associatedData?: string;

  @IsUUID()
  senderDeviceId!: string;

  @IsUUID()
  recipientDeviceId!: string;
}

export class GetEnvelopesRequestDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsUUID()
  recipientDeviceId?: string;
}

export class MarkEnvelopeDeliveredDto {
  @IsUUID()
  envelopeId!: string;
}

export class MarkEnvelopeFailedDto {
  @IsUUID()
  envelopeId!: string;

  @IsString()
  @MaxLength(500)
  error!: string;
}