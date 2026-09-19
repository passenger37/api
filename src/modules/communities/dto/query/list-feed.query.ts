import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { POST_SORT_OPTIONS } from '../../constants/community-post.constants';
import { COMMUNITY_FEED_MAX_PAGE_SIZE } from '../../constants/community.constants';

export class ListFeedQuery {
  @ApiPropertyOptional({ description: 'Filter by category id.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Pagination cursor.' })
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

  @ApiPropertyOptional({
    enum: POST_SORT_OPTIONS,
    description: 'Feed ordering.',
  })
  @IsOptional()
  @IsIn(POST_SORT_OPTIONS)
  sort?: (typeof POST_SORT_OPTIONS)[number];
}
