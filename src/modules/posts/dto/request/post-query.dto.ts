import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PostVisibility, PostStatus, ReactionType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class GetPostsQuery extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PostVisibility, isArray: true, description: 'Filter by visibility' })
  @IsOptional()
  @IsEnum(PostVisibility, { each: true })
  visibility?: PostVisibility[];

  @ApiPropertyOptional({ enum: PostStatus, isArray: true, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(PostStatus, { each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filter by author ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Filter by hashtag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: ['LATEST', 'OLDEST', 'MOST_REACTIONS', 'MOST_COMMENTS', 'MOST_REPOSTS'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['LATEST', 'OLDEST', 'MOST_REACTIONS', 'MOST_COMMENTS', 'MOST_REPOSTS'])
  sort?: 'LATEST' | 'OLDEST' | 'MOST_REACTIONS' | 'MOST_COMMENTS' | 'MOST_REPOSTS';

  @ApiPropertyOptional({ description: 'Cursor for pagination (base64url encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items per page (max 50)', maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class GetUserPostsQuery extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PostVisibility, isArray: true, description: 'Filter by visibility' })
  @IsOptional()
  @IsEnum(PostVisibility, { each: true })
  visibility?: PostVisibility[];

  @ApiPropertyOptional({ description: 'Cursor for pagination (base64url encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items per page (max 50)', maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class GetReactionsQuery extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReactionType, description: 'Filter by reaction type' })
  @IsOptional()
  @IsEnum(ReactionType)
  type?: ReactionType;

  @ApiPropertyOptional({ description: 'Cursor for pagination (base64url encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items per page (max 50)', maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class GetReportsQuery extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'], description: 'Filter by status' })
  @IsOptional()
  @IsEnum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Cursor for pagination (base64url encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items per page (max 50)', maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}