import { E2eeDeviceRevocation, E2eeRevocationReason } from '@prisma/client';

export interface RevocationResponse {
  id: string;
  deviceId: string;
  reason: E2eeRevocationReason;
  initiatedByUserId: string;
  acknowledged: boolean;
  revokedAt: Date;
  acknowledgedAt: Date | null;
  replacementDeviceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeRevocation(revocation: E2eeDeviceRevocation): RevocationResponse {
  return {
    id: revocation.id,
    deviceId: revocation.deviceId,
    reason: revocation.reason,
    initiatedByUserId: revocation.initiatedByUserId,
    acknowledged: revocation.acknowledged,
    revokedAt: revocation.revokedAt,
    acknowledgedAt: revocation.acknowledgedAt,
    replacementDeviceId: revocation.replacementDeviceId,
    createdAt: revocation.createdAt,
    updatedAt: revocation.updatedAt,
  };
}

export function serializeRevocationList(revocations: E2eeDeviceRevocation[]): RevocationResponse[] {
  return revocations.map(serializeRevocation);
}