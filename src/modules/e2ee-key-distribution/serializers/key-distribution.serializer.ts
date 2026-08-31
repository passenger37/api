export function serializeKeyBundle(device: {
  deviceId: string;
  identityKeyPublic: string;
  signedPrekey: {
    signedPreKeyId: number;
    publicKey: string;
    signature: string;
  } | null;
  oneTimePrekeyCount: number;
}) {
  return {
    deviceId: device.deviceId,
    identityKeyPublic: device.identityKeyPublic,
    signedPrekey: device.signedPrekey,
    oneTimePrekeyCount: device.oneTimePrekeyCount,
  };
}
