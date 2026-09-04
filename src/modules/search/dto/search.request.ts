import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdvancedSearchRequestDto {
  @ApiPropertyOptional({
    description: 'The text to search for across users, chats, channels, etc.',
    example: 'hello world',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by server ID' })
  @IsOptional()
  @IsUUID()
  serverId?: string;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Filter by author user ID' })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Restrict results to a content type',
    enum: [
      'user',
      'users',
      'server',
      'servers',
      'channel',
      'channels',
      'message',
      'messages',
      'channel_message',
      'direct_message',
    ],
  })
  @IsOptional()
  @IsEnum([
    'user',
    'users',
    'server',
    'servers',
    'channel',
    'channels',
    'message',
    'messages',
    'channel_message',
    'direct_message',
  ])
  contentType?:
    | 'user'
    | 'users'
    | 'server'
    | 'servers'
    | 'channel'
    | 'channels'
    | 'message'
    | 'messages'
    | 'channel_message'
    | 'direct_message';

  @ApiPropertyOptional({
    description: 'Search from this date (ISO)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Search up to this date (ISO)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Only include content with attachments' })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiPropertyOptional({ description: 'Minimum relevance score (0.1 - 1)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Include E2EE content' })
  @IsOptional()
  @IsBoolean()
  searchE2EE?: boolean;

  @ApiPropertyOptional({
    description: 'Number of results per page (1 - 100)',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Facet fields to include',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facets?: string[];
}

export class SearchSuggestionsRequestDto {
  @ApiPropertyOptional({
    description: 'Partial query to suggest completions for',
    required: true,
  })
  @IsString()
  @Min(1)
  partialQuery!: string;

  @ApiPropertyOptional({ description: 'Max suggestions (1 - 20)', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class SearchAnalyticsRequestDto {
  @ApiPropertyOptional({
    description: 'Search engine',
    enum: ['meilisearch', 'postgres'],
  })
  @IsOptional()
  @IsEnum(['meilisearch', 'postgres'])
  engine?: 'meilisearch' | 'postgres';

  @ApiPropertyOptional({
    description: 'Days of analytics (1 - 365)',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class ReindexRequestDto {
  @ApiPropertyOptional({
    description: 'Scope to reindex',
    enum: ['all', 'messages', 'servers', 'channels', 'users'],
  })
  @IsOptional()
  @IsEnum(['all', 'messages', 'servers', 'channels', 'users'])
  scope?: 'all' | 'messages' | 'servers' | 'channels' | 'users';

  @ApiPropertyOptional({ description: 'Batch size (100 - 100000)' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  batchSize?: number;
}

export class IndexContentRequestDto {
  @ApiPropertyOptional({ description: 'ID of the content to index' })
  @IsString()
  contentId!: string;

  @ApiPropertyOptional({
    description: 'Type of content',
    enum: ['channel_message', 'direct_message', 'server', 'channel', 'user'],
  })
  @IsEnum(['channel_message', 'direct_message', 'server', 'channel', 'user'])
  contentType!:
    | 'channel_message'
    | 'direct_message'
    | 'server'
    | 'channel'
    | 'user';

  @ApiPropertyOptional({ description: 'Display title (username/name)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Content body to index' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Server ID the content belongs to' })
  @IsOptional()
  @IsString()
  serverId?: string;

  @ApiPropertyOptional({ description: 'Channel ID the content belongs to' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Author user ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Optional metadata (string)' })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class RemoveFromIndexRequestDto {
  @ApiPropertyOptional({ description: 'ID of the content to remove' })
  @IsString()
  contentId!: string;

  @ApiPropertyOptional({
    description: 'Type of content',
    enum: ['channel_message', 'direct_message', 'server', 'channel', 'user'],
  })
  @IsEnum(['channel_message', 'direct_message', 'server', 'channel', 'user'])
  contentType!:
    | 'channel_message'
    | 'direct_message'
    | 'server'
    | 'channel'
    | 'user';
}
