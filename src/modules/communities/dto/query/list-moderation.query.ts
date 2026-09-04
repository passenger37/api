import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityModerationActionType } from '@prisma/client';

import { COMMUNITY_MAX_PAGE_SIZE } from '../../constants/community.constants';

export class ListModerationQuery {
  @ApiPropertyOptional({ enum: CommunityModerationActionType })
  @IsOptional()
  @IsEnum(CommunityModerationActionType)
  actionType?: CommunityModerationActionType;

  @ApiPropertyOptional({ description: 'Pagination cursor (action id).' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COMMUNITY_MAX_PAGE_SIZE)
  limit?: number;
}
