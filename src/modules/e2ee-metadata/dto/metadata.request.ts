import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateSealedSenderKeyDto {
  @IsUUID()
  deviceId!: string;

  @IsString()
  publicKey!: string;

  @IsString()
  encryptedPrivateKey!: string;

  @IsNumber()
  @Min(1)
  expiresInDays!: number;
}

export class CreatePirRequestDto {
  @IsUUID()
  deviceId!: string;

  @IsString()
  encryptedQuery!: string;
}

export class GetPirRequestResponseDto {
  @IsUUID()
  requestId!: string;
}

export class UpdateMetadataPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4096)
  minPaddingSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8192)
  maxPaddingSize?: number;

  @IsOptional()
  @IsBoolean()
  enableSealedSender?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePir?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  batchWindowMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  minBatchSize?: number;

  @IsOptional()
  @IsBoolean()
  hideGroupMembership?: boolean;
}
