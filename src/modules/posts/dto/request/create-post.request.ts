import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsUrl, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { PostVisibility, PostContentType, ReactionType, PostReportReason } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostMediaDto {
  @ApiProperty({ description: 'Media attachment ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: 'Alt text for accessibility' })
  @IsOptional()
  @IsString()
  altText?: string;
}

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'Post text content', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;

  @ApiProperty({ enum: PostVisibility, description: 'Post visibility' })
  @IsEnum(PostVisibility)
  visibility: PostVisibility;

  @ApiPropertyOptional({ type: [CreatePostMediaDto], description: 'Media attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto[];

  @ApiPropertyOptional({ description: 'Content warning', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  contentWarning?: string;

  @ApiPropertyOptional({ description: 'Mark as sensitive content' })
  @IsOptional()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Content language code' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  language?: string;

  @ApiPropertyOptional({ description: 'Schedule post for later' })
  @IsOptional()
  scheduledAt?: Date;
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post text content', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;

  @ApiPropertyOptional({ enum: PostVisibility, description: 'Post visibility' })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ description: 'Content warning', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  contentWarning?: string | null;

  @ApiPropertyOptional({ description: 'Mark as sensitive content' })
  @IsOptional()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Content language code' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  language?: string | null;
}

export class ReactToPostDto {
  @ApiProperty({ enum: ReactionType, description: 'Reaction type' })
  @IsEnum(ReactionType)
  type: ReactionType;
}

export class ReportPostDto {
  @ApiProperty({ enum: PostReportReason, description: 'Report reason' })
  @IsEnum(PostReportReason)
  reason: PostReportReason;

  @ApiPropertyOptional({ description: 'Additional details', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  detailText?: string;
}

export class CreateRepostDto {
  @ApiPropertyOptional({ description: 'Optional comment on repost', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;
}

export class CreateQuotePostDto {
  @ApiProperty({ description: 'Quote post content', maxLength: 10000 })
  @IsString()
  @Length(1, 10000)
  content: string;

  @ApiProperty({ enum: PostVisibility, description: 'Quote post visibility' })
  @IsEnum(PostVisibility)
  visibility: PostVisibility;
}