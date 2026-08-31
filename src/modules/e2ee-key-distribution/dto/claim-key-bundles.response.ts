export class ClaimedPreKeyDto {
  preKeyId: number;
  publicKey: string;
}

export class ClaimedDeviceDto {
  deviceId: string;
  preKeys: ClaimedPreKeyDto[];
}

export class ClaimKeyBundlesResponseDto {
  claimed: ClaimedDeviceDto[];
}
