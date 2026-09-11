import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  COMMUNITY_POST_CONTENT_MAX_LENGTH,
  COMMUNITY_POST_TITLE_MAX_LENGTH,
} from '../../constants/community.constants';
import { COMMUNITY_POST_VISIBILITY_OPTIONS } from '../../constants/community-post.constants';
import {
  CreatePostMediaItemRequest,
  CreatePostMentionItemRequest,
} from './create-post.request';

export class EditPostRequest {
  @ApiPropertyOptional({ maxLength: COMMUNITY_POST_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_POST_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({ maxLength: COMMUNITY_POST_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_POST_CONTENT_MAX_LENGTH)
  content?: string;

  @ApiPropertyOptional({ enum: COMMUNITY_POST_VISIBILITY_OPTIONS })
  @IsOptional()
  @IsIn(COMMUNITY_POST_VISIBILITY_OPTIONS)
  visibility?: (typeof COMMUNITY_POST_VISIBILITY_OPTIONS)[number];

  @ApiPropertyOptional({ description: 'Category id, or null to uncategorize.' })
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contentWarning?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string | null;

  @ApiPropertyOptional({ description: 'Replace the hashtag set.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ description: 'Replace the mention set.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMentionItemRequest)
  mentions?: CreatePostMentionItemRequest[];

  @ApiPropertyOptional({ description: 'Replace the media set.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaItemRequest)
  media?: CreatePostMediaItemRequest[];
}