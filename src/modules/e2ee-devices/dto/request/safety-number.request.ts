import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class VerifySafetyNumberRequest {
  @IsUUID()
  localDeviceId!: string;

  @IsUUID()
  remoteDeviceId!: string;

  @IsString()
  remoteIdentityKey!: string;

  @IsNumber()
  @Min(1)
  iterations!: number;
}

export class VerifySafetyNumberResponse {
  success!: boolean;
  verified!: boolean;
  scannableFingerprint?: string;
  displayableFingerprint?: string;
}

export class DeviceVerificationStatusRequest {
  @IsUUID()
  localDeviceId!: string;

  @IsUUID()
  remoteDeviceId!: string;
}

export class DeviceVerificationStatusResponse {
  success!: boolean;
  verified!: boolean;
  verifiedAt?: string | null;
}

export class RotateKeysAndReverifyRequest {
  @IsUUID()
  deviceId!: string;
}
