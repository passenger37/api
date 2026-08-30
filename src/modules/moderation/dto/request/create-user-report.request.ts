import { UserReportReason } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserReportRequest {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsEnum(UserReportReason)
  reason: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detailText?: string;
}
