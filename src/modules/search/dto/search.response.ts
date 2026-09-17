import { SearchSuggestion } from '../services/search.service';

export class SearchResultDto {
  id!: string;
  contentType!: string;
  contentId!: string;
  serverId?: string;
  channelId?: string;
  authorId?: string;
  title?: string;
  content!: string;
  highlights?: Record<string, string[]>;
  score!: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class FacetedSearchResponseDto {
  results!: SearchResultDto[];
  totalHits!: number;
  facets!: {
    servers: Record<string, number>;
    channels: Record<string, number>;
    authors: Record<string, number>;
    contentTypes: Record<string, number>;
    dateHistogram: Record<string, number>;
  };
  processingTimeMs!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}

export class SearchSuggestionDto {
  query!: string;
  count!: number;
}

export class SearchAnalyticsResponseDto {
  totalSearches!: number;
  uniqueUsers!: number;
  avgLatencyMs!: number;
  topQueries!: SearchSuggestion[];
  searchesPerDay!: Record<string, number>;
  topSearchedUsers!: {
    contentId: string;
    username: string;
    displayName: string;
    searchCount: number;
  }[];
}

export class SearchHistoryItemDto {
  id!: string;
  queryText!: string;
  resultCount!: number;
  latencyMs!: number;
  engine!: string;
  createdAt!: Date;
}

export class SearchHistoryResponseDto {
  success!: boolean;
  history!: SearchHistoryItemDto[];
}

export class ReindexResponseDto {
  success!: boolean;
  indexed!: number;
  errors!: number;
}

export class IndexContentResponseDto {
  success!: boolean;
  indexed!: boolean;
}
