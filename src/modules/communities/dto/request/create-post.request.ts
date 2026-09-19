import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  COMMUNITY_POST_CONTENT_MAX_LENGTH,
  COMMUNITY_POST_TITLE_MAX_LENGTH,
} from '../../constants/community.constants';
import { COMMUNITY_POST_CONTENT_TYPE_OPTIONS } from '../../constants/community-post.constants';

export class CreatePostMediaItemRequest {
  @ApiPropertyOptional({ description: 'Source media id.' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiProperty({ description: 'Media type, e.g. IMAGE/VIDEO/AUDIO.' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Resolved media URL.' })
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: 'MIME type of the media.' })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;
}

export class CreatePostMentionItemRequest {
  @ApiProperty({ description: 'User id being mentioned.' })
  @IsString()
  mentionedUserId: string;

  @ApiProperty({ description: 'Character offset in the post content.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position: number;

  @ApiProperty({ description: 'Length of the mention token.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  length: number;
}

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

  @ApiPropertyOptional({ enum: COMMUNITY_POST_CONTENT_TYPE_OPTIONS })
  @IsOptional()
  @IsEnum(COMMUNITY_POST_CONTENT_TYPE_OPTIONS)
  contentType?: (typeof COMMUNITY_POST_CONTENT_TYPE_OPTIONS)[number];

  @ApiPropertyOptional({ description: 'Hashtag list (without leading #).' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ description: 'Mentions extracted from the content.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMentionItemRequest)
  mentions?: CreatePostMentionItemRequest[];

  @ApiPropertyOptional({ description: 'Media attached to the post.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaItemRequest)
  media?: CreatePostMediaItemRequest[];
}
