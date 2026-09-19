import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommentReportReason } from '@prisma/client';

export class CommentReportRequest {
  @ApiProperty({ enum: CommentReportReason })
  @IsIn(Object.values(CommentReportReason))
  reason!: CommentReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  description?: string;
}
