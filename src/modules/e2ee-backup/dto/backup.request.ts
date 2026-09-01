import { IsString, IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateBackupRequest {
  @IsUUID()
  deviceId!: string;

  @IsString()
  payload!: string;

  @IsNumber()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  recoveryPasswordHash?: string;
}

export class GetBackupsRequest {
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}