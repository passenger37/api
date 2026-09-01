import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { E2eeRevocationReason } from '@prisma/client';

export class RevokeDeviceRequest {
  @IsUUID()
  deviceId!: string;

  @IsEnum(E2eeRevocationReason)
  reason!: E2eeRevocationReason;
}

export class AcknowledgeRevocationRequest {
  @IsUUID()
  revocationId!: string;
}

export class GetRevocationsRequest {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  initiatedByUserId?: string;
}