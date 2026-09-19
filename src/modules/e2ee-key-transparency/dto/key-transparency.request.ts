import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateKeyTransparencyEntryRequest {
  @IsUUID()
  deviceId!: string;

  @IsString()
  commitment!: string;

  @IsNumber()
  @Min(0)
  epoch!: number;
}

export class VerifyKeyTransparencyRequest {
  @IsUUID()
  entryId!: string;
}

export class GetKeyTransparencyEntriesRequest {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
