import {
  E2eeSealedSenderKey,
  E2eePirRequest,
  E2eeMetadataPolicy,
} from '@prisma/client';

export class SealedSenderKeyResponseDto {
  id!: string;
  userId!: string;
  deviceId!: string;
  publicKey!: string;
  isActive!: boolean;
  expiresAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PirRequestResponseDto {
  id!: string;
  userId!: string;
  deviceId!: string;
  encryptedQuery!: string;
  encryptedResponse!: string | null;
  status!: string;
  expiresAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export class MetadataPolicyResponseDto {
  userId!: string;
  minPaddingSize!: number;
  maxPaddingSize!: number;
  enableSealedSender!: boolean;
  enablePir!: boolean;
  batchWindowMs!: number;
  minBatchSize!: number;
  hideGroupMembership!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CreateSealedSenderKeyResponseDto {
  success!: boolean;
  key!: SealedSenderKeyResponseDto;
}

export class CreatePirRequestResponseDto {
  success!: boolean;
  request!: PirRequestResponseDto;
}

export class GetPirRequestResponseDto {
  success!: boolean;
  request!: PirRequestResponseDto;
}

export class UpdateMetadataPolicyResponseDto {
  success!: boolean;
  policy!: MetadataPolicyResponseDto;
}

export class GetMetadataPolicyResponseDto {
  success!: boolean;
  policy!: MetadataPolicyResponseDto;
}

export class PadEnvelopeRequestDto {
  plaintextLength!: number;
}

export class PadEnvelopeResponseDto {
  success!: boolean;
  paddedLength!: number;
  paddingBytes!: number;
}

export class BatchDeliveryRequestDto {
  envelopeIds!: string[];
}

export class BatchDeliveryResponseDto {
  success!: boolean;
  batchedCount!: number;
  batchId!: string;
}
