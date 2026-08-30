import { MessageReportReason } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMessageReportRequest {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsEnum(MessageReportReason)
  reason: MessageReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detailText?: string;
}
