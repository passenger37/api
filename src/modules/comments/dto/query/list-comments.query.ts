import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsString } from 'class-validator';

import {
  COMMENT_SORT,
  COMMENT_DEFAULTS,
} from '../../constants/comment.constants';

export class ListCommentsQuery {
  @ApiPropertyOptional({ enum: ['BEST', 'TOP', 'NEW', 'OLD'], default: 'BEST' })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(COMMENT_SORT))
  sort?: string = 'BEST';

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ReactToCommentRequest {
  @ApiProperty({ enum: ['UPVOTE', 'DOWNVOTE'] })
  @IsString()
  @IsIn(['UPVOTE', 'DOWNVOTE'])
  vote!: 'UPVOTE' | 'DOWNVOTE';
}
