import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNITY_COMMENT_MAX_PAGE_SIZE } from '../../constants/community.constants';

export class ListCommentsQuery {
  @ApiPropertyOptional({ description: 'Pagination cursor (comment id).' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COMMUNITY_COMMENT_MAX_PAGE_SIZE)
  limit?: number;
}
