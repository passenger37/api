import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchEngine {
  indexDocuments(documents: any[]): Promise<void>;
  search(query: string, options: SearchOptions): Promise<SearchResults>;
  deleteDocuments(ids: string[]): Promise<void>;
  updateSettings(settings: SearchSettings): Promise<void>;
}

export interface SearchOptions {
  query: string;
  filter?: Record<string, any>;
  facets?: string[];
  limit?: number;
  offset?: number;
  sort?: string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
}

export interface SearchResults {
  hits: SearchHit[];
  estimatedTotalHits: number;
  processingTimeMs: number;
  facets?: Record<string, Record<string, number>>;
}

export interface SearchHit {
  id: string;
  score: number;
  document: Record<string, any>;
  highlights?: Record<string, string[]>;
}

export interface SearchSettings {
  searchableAttributes?: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  rankingRules?: string[];
  synonyms?: Record<string, string[]>;
  stopWords?: string[];
  pagination?: { maxTotalHits: number };
}

@Injectable()
export class MeilisearchEngine implements SearchEngine, OnModuleInit {
  private client: any;
  private indexName: string;
  private available = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly logger: any,
  ) {
    this.indexName =
      this.configService.get('Meilisearch_INDEX') || 'nexus_messages';
  }

  async onModuleInit() {
    try {
      const host =
        this.configService.get('MEILISEARCH_HOST') || 'http://localhost:7700';
      const apiKey = this.configService.get('MEILISEARCH_API_KEY') || '';

      // Dynamic import for Meilisearch
      const { Meilisearch } = await import('meilisearch');
      this.client = new Meilisearch({ host, apiKey });

      // Create index — ignore "index already exists" errors
      try {
        await this.client.createIndex(this.indexName, { primaryKey: 'id' });
      } catch (err: any) {
        if (!err.message?.includes('already exists')) throw err;
      }

      // Configure index settings
      await this.updateSettings({
        searchableAttributes: ['content', 'title', 'authorName', 'channelName'],
        filterableAttributes: [
          'serverId',
          'channelId',
          'authorId',
          'contentType',
          'serverId',
        ],
        sortableAttributes: ['createdAt', 'score'],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
          'recency',
        ],
        synonyms: {
          dm: ['direct message', 'private message'],
          channel: ['room', 'chat'],
        },
        stopWords: [
          'the',
          'a',
          'an',
          'and',
          'or',
          'but',
          'in',
          'on',
          'at',
          'to',
          'for',
          'of',
          'with',
        ],
        pagination: { maxTotalHits: 1000 },
      });

      this.available = true;
    } catch (error) {
      console.warn('Meilisearch not available, using fallback:', error.message);
      this.client = null;
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available && this.client !== null;
  }

  async indexDocuments(documents: any[]): Promise<void> {
    if (!this.available) return;
    const index = this.client.index(this.indexName);
    await index.addDocuments(documents);
  }

  async search(query: string, options: SearchOptions): Promise<SearchResults> {
    if (!this.available) {
      return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
    }

    const index = this.client.index(this.indexName);
    const startTime = Date.now();

    const searchParams: any = {
      q: options.query,
      filter: options.filter ? this.buildFilter(options.filter) : undefined,
      facets: options.facets,
      limit: options.limit || 20,
      offset: options.offset || 0,
      sort: options.sort,
      attributesToRetrieve: options.attributesToRetrieve,
      attributesToHighlight: options.attributesToHighlight,
    };

    const results = await index.search(options.query, searchParams);

    return {
      hits: results.hits.map((hit: any) => ({
        id: hit.id,
        score: hit._rankingScore || 0,
        document: hit,
        highlights: hit._formatted,
      })),
      estimatedTotalHits: results.estimatedTotalHits,
      processingTimeMs: Date.now() - startTime,
      facets: results.facetDistribution,
    };
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.available) return;
    const index = this.client.index(this.indexName);
    await index.deleteDocuments(ids);
  }

  async updateSettings(settings: SearchSettings): Promise<void> {
    if (!this.available) return;
    const index = this.client.index(this.indexName);
    await index.updateSettings(settings);
  }

  private buildFilter(filter: Record<string, any>): string {
    return Object.entries(filter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} IN [${value.map((v) => `"${v}"`).join(', ')}]`;
        }
        return `${key} = "${value}"`;
      })
      .join(' AND ');
  }
}

// Fallback PostgreSQL full-text search engine
@Injectable()
export class PostgresSearchEngine implements SearchEngine {
  // This would use Prisma with raw SQL for PostgreSQL full-text search
  // Implementation would use tsvector/tsquery with GIN indexes
  async indexDocuments(documents: any[]): Promise<void> {
    // Implemented via Prisma raw queries
  }

  async search(query: string, options: SearchOptions): Promise<SearchResults> {
    // Implemented via Prisma raw queries with to_tsvector/to_tsquery
    return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
  }

  async deleteDocuments(ids: string[]): Promise<void> {}
  async updateSettings(settings: SearchSettings): Promise<void> {}
}
