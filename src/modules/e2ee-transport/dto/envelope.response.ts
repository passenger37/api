import { E2eeEnvelopeType, E2eeEnvelopeStatus } from '@prisma/client';

export class EnvelopeResponseDto {
  id!: string;
  sessionId!: string;
  type!: E2eeEnvelopeType;
  ciphertext!: string;
  associatedData!: string | null;
  senderDeviceId!: string;
  recipientDeviceId!: string;
  status!: E2eeEnvelopeStatus;
  attempts!: number;
  lastError!: string | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SendEnvelopeResponseDto {
  success!: boolean;
  envelope!: EnvelopeResponseDto;
}

export class GetEnvelopesResponseDto {
  success!: boolean;
  envelopes!: EnvelopeResponseDto[];
  nextCursor?: string;
  hasMore!: boolean;
}