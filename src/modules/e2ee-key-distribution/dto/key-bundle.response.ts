export class KeyBundleDeviceDto {
  deviceId: string;
  identityKeyPublic: string;
  signedPrekey: {
    signedPreKeyId: number;
    publicKey: string;
    signature: string;
  } | null;
  oneTimePrekeyCount: number;
}

export class KeyBundleResponseDto {
  devices: KeyBundleDeviceDto[];
}
