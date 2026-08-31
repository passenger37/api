export interface E2eeSignedPreKeyResponse {
  signedPreKeyId: number;
  publicKey: string;
  signature: string;
}

export interface E2eeDeviceResponse {
  id: string;
  name: string;
  platform: string;
  identityKeyPublic: string;
  isRevoked: boolean;
  revokedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  signedPreKey: E2eeSignedPreKeyResponse | null;
  oneTimePreKeyCount: number;
}
