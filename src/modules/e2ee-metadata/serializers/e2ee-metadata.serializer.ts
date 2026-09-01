import { E2eeSealedSenderKey, E2eePirRequest, E2eeMetadataPolicy } from '@prisma/client';

export interface SealedSenderKeyResponse {
  id: string;
  userId: string;
  deviceId: string;
  publicKey: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PirRequestResponse {
  id: string;
  userId: string;
  deviceId: string;
  encryptedQuery: string;
  encryptedResponse: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetadataPolicyResponse {
  userId: string;
  minPaddingSize: number;
  maxPaddingSize: number;
  enableSealedSender: boolean;
  enablePir: boolean;
  batchWindowMs: number;
  minBatchSize: number;
  hideGroupMembership: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeSealedSenderKey(key: E2eeSealedSenderKey): SealedSenderKeyResponse {
  return {
    id: key.id,
    userId: key.userId,
    deviceId: key.deviceId,
    publicKey: key.publicKey,
    isActive: key.isActive,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

export function serializePirRequest(request: E2eePirRequest): PirRequestResponse {
  return {
    id: request.id,
    userId: request.userId,
    deviceId: request.deviceId,
    encryptedQuery: request.encryptedQuery,
    encryptedResponse: request.encryptedResponse,
    status: request.status,
    expiresAt: request.expiresAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function serializeMetadataPolicy(policy: E2eeMetadataPolicy): MetadataPolicyResponse {
  return {
    userId: policy.userId,
    minPaddingSize: policy.minPaddingSize,
    maxPaddingSize: policy.maxPaddingSize,
    enableSealedSender: policy.enableSealedSender,
    enablePir: policy.enablePir,
    batchWindowMs: policy.batchWindowMs,
    minBatchSize: policy.minBatchSize,
    hideGroupMembership: policy.hideGroupMembership,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}