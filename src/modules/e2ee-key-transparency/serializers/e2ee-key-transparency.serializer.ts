import { E2eeKeyTransparencyEntry } from '@prisma/client';

export interface KeyTransparencyResponse {
  id: string;
  userId: string;
  deviceId: string;
  commitment: string;
  epoch: number;
  verified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

export function serializeKeyTransparency(
  entry: E2eeKeyTransparencyEntry,
): KeyTransparencyResponse {
  return {
    id: entry.id,
    userId: entry.userId,
    deviceId: entry.deviceId,
    commitment: entry.commitment,
    epoch: Number(entry.epoch),
    verified: entry.verified,
    verifiedAt: entry.verifiedAt,
    createdAt: entry.createdAt,
  };
}

export function serializeKeyTransparencyList(
  entries: E2eeKeyTransparencyEntry[],
): KeyTransparencyResponse[] {
  return entries.map(serializeKeyTransparency);
}
