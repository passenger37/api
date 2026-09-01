import { IsUUID, IsEnum, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MediaJobDto {
  @ApiProperty()
  @IsUUID()
  attachmentId!: string;

  @ApiProperty({ enum: ['THUMBNAIL', 'TRANSCODE', 'AV_SCAN', 'WATERMARK', 'METADATA_EXTRACTION'] })
  @IsEnum(['THUMBNAIL', 'TRANSCODE', 'AV_SCAN', 'WATERMARK', 'METADATA_EXTRACTION'])
  type!: 'THUMBNAIL' | 'TRANSCODE' | 'AV_SCAN' | 'WATERMARK' | 'METADATA_EXTRACTION';

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  input?: Record<string, any>;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;
}

export class ProcessAttachmentDto {
  @ApiProperty()
  @IsUUID()
  attachmentId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(['THUMBNAIL', 'TRANSCODE', 'AV_SCAN', 'WATERMARK', 'METADATA_EXTRACTION'], { each: true })
  jobTypes?: Array<'THUMBNAIL' | 'TRANSCODE' | 'AV_SCAN' | 'WATERMARK' | 'METADATA_EXTRACTION'>;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  input?: Record<string, any>;
}

export class MediaJobStatusDto {
  @ApiProperty()
  @IsUUID()
  jobId!: string;

  @ApiProperty({ enum: ['media:thumbnail', 'media:transcode', 'media:av-scan', 'media:watermark', 'media:metadata'] })
  @IsEnum(['media:thumbnail', 'media:transcode', 'media:av-scan', 'media:watermark', 'media:metadata'])
  queueName!: 'media:thumbnail' | 'media:transcode' | 'media:av-scan' | 'media:watermark' | 'media:metadata';
}

export class MediaConfigDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => Object)
  value!: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ProcessingStatsResponseDto {
  @ApiProperty()
  pending!: number;

  @ApiProperty()
  processing!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  byType!: Record<string, number>;
}