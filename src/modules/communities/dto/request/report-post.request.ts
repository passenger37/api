import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { POST_REPORT_REASONS } from '../../constants/community-post.constants';

export class ReportPostRequest {
  @ApiProperty({ enum: POST_REPORT_REASONS, description: 'Report reason.' })
  @IsEnum(POST_REPORT_REASONS)
  reason: (typeof POST_REPORT_REASONS)[number];

  @ApiPropertyOptional({ maxLength: 2000, description: 'Additional context.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detailText?: string;
}