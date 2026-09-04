import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityModerationActionType } from '@prisma/client';

export class CreateModerationActionRequest {
  @ApiProperty({ enum: CommunityModerationActionType })
  @IsEnum(CommunityModerationActionType)
  actionType: CommunityModerationActionType;

  @ApiPropertyOptional({ description: 'Target user id when applicable.' })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({ description: 'Object type: POST | COMMENT.' })
  @IsOptional()
  @IsString()
  objectType?: string;

  @ApiPropertyOptional({ description: 'Object id: post or comment id.' })
  @IsOptional()
  @IsString()
  objectId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
