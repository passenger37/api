import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsObject,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EnqueueJobDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({
    enum: [
      'jobs:default',
      'jobs:high',
      'jobs:low',
      'jobs:scheduled',
      'jobs:webhooks',
      'jobs:notifications',
      'jobs:cleanup',
      'jobs:analytics',
    ],
  })
  @IsEnum([
    'jobs:default',
    'jobs:high',
    'jobs:low',
    'jobs:scheduled',
    'jobs:webhooks',
    'jobs:notifications',
    'jobs:cleanup',
    'jobs:analytics',
  ])
  queueName!: string;

  @ApiProperty()
  @IsObject()
  payload!: Record<string, any>;

  @ApiProperty({ required: false, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ required: false, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  scheduledAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class BatchEnqueueDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnqueueJobDto)
  jobs!: EnqueueJobDto[];
}

export class GetJobsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  queueName?: string;

  @ApiProperty({
    required: false,
    enum: [
      'PENDING',
      'QUEUED',
      'SCHEDULED',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'RETRYING',
    ],
  })
  @IsOptional()
  @IsEnum([
    'PENDING',
    'QUEUED',
    'SCHEDULED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'RETRYING',
  ])
  status?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @Min(1)
  @Max(100)
  name!: string;

  @ApiProperty()
  @IsString()
  cronExpression!: string;

  @ApiProperty({ required: false, default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty()
  @IsString()
  jobName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

export class UpdateScheduleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetDeadLettersDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  queueName?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ResolveDeadLetterDto {
  @ApiProperty()
  @IsString()
  resolutionNotes!: string;
}

export class GetMetricsDto {
  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class QueueManagementDto {
  @ApiProperty({
    enum: [
      'jobs:default',
      'jobs:high',
      'jobs:low',
      'jobs:scheduled',
      'jobs:webhooks',
      'jobs:notifications',
      'jobs:cleanup',
      'jobs:analytics',
    ],
  })
  @IsEnum([
    'jobs:default',
    'jobs:high',
    'jobs:low',
    'jobs:scheduled',
    'jobs:webhooks',
    'jobs:notifications',
    'jobs:cleanup',
    'jobs:analytics',
  ])
  queueName!: string;
}
