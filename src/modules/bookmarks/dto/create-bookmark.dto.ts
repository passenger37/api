import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookmarkTargetType } from '../types/bookmark.types';

export class CreateBookmarkDto {
  @ApiProperty({ enum: BookmarkTargetType, example: BookmarkTargetType.POST })
  @IsEnum(BookmarkTargetType)
  targetType: BookmarkTargetType;

  @ApiProperty({ example: 'post-123' })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiPropertyOptional({ example: 'collection-id', required: false })
  @IsOptional()
  @IsUUID()
  collectionId?: string;
}

export class ListBookmarksDto {
  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'cursor-string', required: false })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: BookmarkTargetType, required: false })
  @IsOptional()
  @IsEnum(BookmarkTargetType)
  targetType?: BookmarkTargetType;

  @ApiPropertyOptional({ example: 'collection-id', required: false })
  @IsOptional()
  @IsUUID()
  collectionId?: string;
}

export class MoveBookmarkDto {
  @ApiPropertyOptional({ example: 'collection-id', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;
}

export class CreateBookmarkCollectionDto {
  @ApiProperty({ example: 'Backend Resources', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Saved posts about backend development', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  isPrivate?: boolean = true;
}

export class UpdateBookmarkCollectionDto {
  @ApiPropertyOptional({ example: 'Backend Resources', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Saved posts about backend development', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isPrivate?: boolean;
}

export class BatchBookmarkStatusDto {
  @ApiProperty({ enum: BookmarkTargetType })
  @IsEnum(BookmarkTargetType)
  targetType: BookmarkTargetType;

  @ApiProperty({ type: [String], example: ['post-1', 'post-2'] })
  @IsString({ each: true })
  targetIds: string[];
}