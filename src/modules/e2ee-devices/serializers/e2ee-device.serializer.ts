import { DeviceWithKeys } from '../repositories/e2ee-device.repository';
import { E2eeDeviceResponse, E2eeSignedPreKeyResponse } from '../responses';

export function serializeSignedPreKey(preKey: {
  signedPreKeyId: number;
  publicKey: string;
  signature: string;
}): E2eeSignedPreKeyResponse {
  return {
    signedPreKeyId: preKey.signedPreKeyId,
    publicKey: preKey.publicKey,
    signature: preKey.signature,
  };
}

export function serializeE2eeDevice(
  device: DeviceWithKeys,
): E2eeDeviceResponse {
  const activePreKey = device.signedPreKeys[0] ?? null;

  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    identityKeyPublic: device.identityKeyPublic,
    isRevoked: device.isRevoked,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
    signedPreKey: activePreKey ? serializeSignedPreKey(activePreKey) : null,
    oneTimePreKeyCount: device._count.oneTimePreKeys,
  };
}
