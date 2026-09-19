import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { AnonymousChatReportReason } from '../../types/anonymous-chat.types';
import { ANONYMOUS_MAX_REPORT_DETAIL_LENGTH } from '../../constants/anonymous-chat.constants';

export class ReportAnonymousUserRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ enum: AnonymousChatReportReason })
  @IsEnum(AnonymousChatReportReason)
  reason!: AnonymousChatReportReason;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(ANONYMOUS_MAX_REPORT_DETAIL_LENGTH)
  detail?: string;
}
