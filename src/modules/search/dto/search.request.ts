import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min, Max, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvancedSearchRequestDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsUUID()
  serverId?: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsEnum(['channel_message', 'direct_message', 'server', 'channel', 'user'])
  contentType?: 'channel_message' | 'direct_message' | 'server' | 'channel' | 'user';

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  dateTo?: Date;

  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  minScore?: number;

  @IsOptional()
  @IsBoolean()
  searchE2EE?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facets?: string[];
}

export class SearchSuggestionsRequestDto {
  @IsString()
  @Min(1)
  partialQuery!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class SearchAnalyticsRequestDto {
  @IsOptional()
  @IsEnum(['meilisearch', 'postgres'])
  engine?: 'meilisearch' | 'postgres';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class ReindexRequestDto {
  @IsOptional()
  @IsEnum(['all', 'messages', 'servers', 'channels', 'users'])
  scope?: 'all' | 'messages' | 'servers' | 'channels' | 'users';

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  batchSize?: number;
}

export class IndexContentRequestDto {
  @IsUUID()
  contentId!: string;

  @IsEnum(['channel_message', 'direct_message', 'server', 'channel', 'user'])
  contentType!: 'channel_message' | 'direct_message' | 'server' | 'channel' | 'user';

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsUUID()
  serverId?: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class RemoveFromIndexRequestDto {
  @IsUUID()
  contentId!: string;

  @IsEnum(['channel_message', 'direct_message', 'server', 'channel', 'user'])
  contentType!: 'channel_message' | 'direct_message' | 'server' | 'channel' | 'user';
}