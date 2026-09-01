import { IsUUID, IsOptional, IsEnum, IsNumber, Min, Max, IsString } from 'class-validator';
import { E2eeDeliveryStatus } from '@prisma/client';

export class CreateDeliveryRequest {
  @IsUUID()
  envelopeId!: string;

  @IsUUID()
  targetDeviceId!: string;
}

export class GetDeliveryQueueRequest {
  @IsOptional()
  @IsUUID()
  envelopeId?: string;

  @IsOptional()
  @IsUUID()
  targetDeviceId?: string;

  @IsOptional()
  @IsEnum(E2eeDeliveryStatus)
  status?: E2eeDeliveryStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MarkDeliveryDeliveredDto {
  @IsUUID()
  queueId!: string;
}

export class MarkDeliveryFailedDto {
  @IsUUID()
  queueId!: string;

  @IsOptional()
  @IsString()
  error?: string;
}

export class CreateGroupDeliveryRequest {
  @IsUUID()
  envelopeId!: string;

  @IsUUID()
  targetDeviceId!: string;
}

export class GetGroupDeliveryQueueRequest {
  @IsOptional()
  @IsUUID()
  envelopeId?: string;

  @IsOptional()
  @IsUUID()
  targetDeviceId?: string;

  @IsOptional()
  @IsEnum(E2eeDeliveryStatus)
  status?: E2eeDeliveryStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}