import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNITY_FEED_MAX_PAGE_SIZE } from '../../constants/community.constants';

export class ListPostsQuery {
  @ApiPropertyOptional({ description: 'Filter by category id.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Pagination cursor (post id).' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COMMUNITY_FEED_MAX_PAGE_SIZE)
  limit?: number;
}
