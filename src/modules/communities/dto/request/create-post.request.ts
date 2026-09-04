import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  COMMUNITY_POST_CONTENT_MAX_LENGTH,
  COMMUNITY_POST_TITLE_MAX_LENGTH,
} from '../../constants/community.constants';

export class CreatePostRequest {
  @ApiPropertyOptional({ description: 'Community category id.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ maxLength: COMMUNITY_POST_TITLE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(COMMUNITY_POST_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ maxLength: COMMUNITY_POST_CONTENT_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(COMMUNITY_POST_CONTENT_MAX_LENGTH)
  content: string;
}
