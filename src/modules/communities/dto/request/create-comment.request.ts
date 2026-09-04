import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNITY_COMMENT_CONTENT_MAX_LENGTH } from '../../constants/community.constants';

export class CreateCommentRequest {
  @ApiProperty({ maxLength: COMMUNITY_COMMENT_CONTENT_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(COMMUNITY_COMMENT_CONTENT_MAX_LENGTH)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment id for threading.' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
