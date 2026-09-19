import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma.service';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import {
  SearchEngine,
  MeilisearchEngine,
  SearchOptions,
  SearchResults,
  SearchHit,
} from './search-engine.service';
import { Prisma, UserStatus } from '@prisma/client';

type UserFacingContentType =
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

const CONTENT_TYPE_MAP: Record<UserFacingContentType, string[]> = {
  user: ['user'],
  users: ['user'],
  server: ['server'],
  servers: ['server'],
  channel: ['channel'],
  channels: ['channel'],
  message: ['channel_message', 'direct_message'],
  messages: ['channel_message', 'direct_message'],
  channel_message: ['channel_message'],
  direct_message: ['direct_message'],
};

function normalizeContentTypes(
  contentType?: UserFacingContentType,
): string[] | null {
  if (!contentType) return null;
  return CONTENT_TYPE_MAP[contentType] ?? [contentType];
}

export interface AdvancedSearchOptions {
  userId: string;
  query?: string;
  serverId?: string;
  channelId?: string;
  authorId?: string;
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
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
  minScore?: number;
  searchE2EE?: boolean; // For client-side E2EE search
  limit?: number;
  offset?: number;
  sort?: string;
  facets?: string[];
}

export interface SearchResult {
  id: string;
  contentType: string;
  contentId: string;
  serverId?: string;
  channelId?: string;
  authorId?: string;
  title?: string;
  content: string;
  highlights?: Record<string, string[]>;
  score: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface FacetedSearchResult {
  results: SearchResult[];
  totalHits: number;
  facets: {
    servers: Record<string, number>;
    channels: Record<string, number>;
    authors: Record<string, number>;
    contentTypes: Record<string, number>;
    dateHistogram: Record<string, number>;
  };
  processingTimeMs: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchSuggestion {
  query: string;
  count: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly primaryEngine: SearchEngine;
  private readonly fallbackEngine: SearchEngine;
  private useMeilisearch: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly indexRepo: SearchIndexRepository,
    private readonly meilisearchEngine: MeilisearchEngine,
  ) {
    this.useMeilisearch =
      this.configService.get('MEILISEARCH_ENABLED') === 'true';
    this.primaryEngine = this.useMeilisearch
      ? this.meilisearchEngine
      : (null as any);
    this.fallbackEngine = null as any; // PostgresSearchEngine would be injected here
  }

  // ============ Indexing ============

  async indexChannelMessage(
    messageId: string,
    data: {
      serverId: string;
      channelId: string;
      authorId: string;
      content: string;
      title?: string;
      metadata?: Record<string, any>;
      createdAt: Date;
    },
  ): Promise<void> {
    await this.indexRepo.upsertIndex('channel_message', messageId, {
      serverId: data.serverId,
      channelId: data.channelId,
      authorId: data.authorId,
      searchableText: [data.title, data.content].filter(Boolean).join(' '),
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: new Date(),
    });

    // Also index in Meilisearch if available
    if (this.useMeilisearch) {
      await this.meilisearchEngine.indexDocuments([
        {
          id: messageId,
          contentType: 'channel_message',
          contentId: messageId,
          serverId: data.serverId,
          channelId: data.channelId,
          authorId: data.authorId,
          content: data.content,
          title: data.title,
          metadata: data.metadata,
          createdAt: data.createdAt.toISOString(),
        },
      ]);
    }
  }

  async indexDirectMessage(
    messageId: string,
    data: {
      authorId: string;
      content: string;
      metadata?: Record<string, any>;
      createdAt: Date;
    },
  ): Promise<void> {
    await this.indexRepo.upsertIndex('direct_message', messageId, {
      authorId: data.authorId,
      searchableText: data.content,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: new Date(),
    });

    if (this.useMeilisearch) {
      await this.meilisearchEngine.indexDocuments([
        {
          id: messageId,
          contentType: 'direct_message',
          contentId: messageId,
          authorId: data.authorId,
          content: data.content,
          metadata: data.metadata,
          createdAt: data.createdAt.toISOString(),
        },
      ]);
    }
  }

  async indexServer(
    serverId: string,
    data: {
      name: string;
      description?: string;
      memberCount: number;
      createdAt: Date;
    },
  ): Promise<void> {
    await this.indexRepo.upsertIndex('server', serverId, {
      searchableText: [data.name, data.description].filter(Boolean).join(' '),
      metadata: { memberCount: data.memberCount },
      createdAt: data.createdAt,
      updatedAt: new Date(),
    });
  }

  async indexChannel(
    channelId: string,
    data: {
      serverId: string;
      name: string;
      description?: string;
      type: string;
      createdAt: Date;
    },
  ): Promise<void> {
    await this.indexRepo.upsertIndex('channel', channelId, {
      serverId: data.serverId,
      searchableText: [data.name, data.description].filter(Boolean).join(' '),
      metadata: { type: data.type },
      createdAt: data.createdAt,
      updatedAt: new Date(),
    });
  }

  async indexUser(
    userId: string,
    data: {
      username: string;
      displayName: string;
      bio?: string;
      avatarUrl?: string;
      createdAt: Date;
    },
  ): Promise<void> {
    await this.indexRepo.upsertIndex('user', userId, {
      authorId: userId,
      searchableText: [data.username, data.displayName, data.bio]
        .filter(Boolean)
        .join(' '),
      metadata: {
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      },
      createdAt: data.createdAt,
      updatedAt: new Date(),
    });
  }

  async removeFromIndex(contentType: string, contentId: string): Promise<void> {
    await this.indexRepo.deleteIndex(contentType, contentId);
    if (this.useMeilisearch) {
      await this.meilisearchEngine.deleteDocuments([contentId]);
    }
  }

  // ============ Search ============

  async advancedSearch(
    options: AdvancedSearchOptions,
  ): Promise<FacetedSearchResult> {
    const startTime = Date.now();
    const pageSize = options.limit || 20;
    const page = Math.floor((options.offset || 0) / pageSize) + 1;

    // Build filter
    const filter: Record<string, any> = {};
    if (options.serverId) filter.serverId = options.serverId;
    if (options.channelId) filter.channelId = options.channelId;
    if (options.authorId) filter.authorId = options.authorId;
    const contentTypes = normalizeContentTypes(options.contentType);
    if (contentTypes) filter.contentTypes = contentTypes;
    if (options.dateFrom || options.dateTo) {
      filter.createdAt = {};
      if (options.dateFrom)
        filter.createdAt['>='] = options.dateFrom.toISOString();
      if (options.dateTo) filter.createdAt['<='] = options.dateTo.toISOString();
    }
    if (options.hasAttachments) filter.hasAttachments = true;

    // Check if user has access to server/channel
    await this.authorizeSearch(options);

    // Perform search
    const searchOptions: SearchOptions = {
      query: options.query || '',
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      facets: ['serverId', 'channelId', 'authorId', 'contentType'],
      limit: options.limit || 20,
      offset: options.offset || 0,
      sort: options.sort ? [`${options.sort}:desc`] : ['createdAt:desc'],
      attributesToRetrieve: ['*'],
      attributesToHighlight: ['content', 'title'],
    };

    const results = await this.executeSearch(searchOptions);
    if (!results.processingTimeMs) {
      results.processingTimeMs = Date.now() - startTime;
    }

    // Rate user hits (how many times each user was surfaced/searched)
    await this.incrementUserHitCounts(results);

    // Log search query
    await this.logSearchQuery(options.userId, options.query || '', results);

    // Build facets
    const facets = this.buildFacets(results.facets || {});

    return {
      results: results.hits.map(this.mapHitToResult),
      totalHits: results.estimatedTotalHits,
      facets,
      processingTimeMs: results.processingTimeMs,
      page,
      pageSize,
      totalPages: Math.ceil(results.estimatedTotalHits / pageSize),
    };
  }

  async executeSearch(options: SearchOptions): Promise<SearchResults> {
    if (this.useMeilisearch && this.meilisearchEngine) {
      try {
        return await this.meilisearchEngine.search(options.query, options);
      } catch (error) {
        this.logger.warn(
          'Meilisearch failed, falling back to PostgreSQL',
          error,
        );
      }
    }

    // Fallback to PostgreSQL full-text search
    return this.postgresSearch(options);
  }

  private async postgresSearch(options: SearchOptions): Promise<SearchResults> {
    const query = options.query || '';
    const filter = options.filter || {};

    const where: Prisma.SearchIndexWhereInput = {};

    if (query) {
      where.OR = [{ searchableText: { contains: query, mode: 'insensitive' } }];
    }

    if (filter.serverId) where.serverId = filter.serverId as string;
    if (filter.channelId) where.channelId = filter.channelId as string;
    if (filter.authorId) where.authorId = filter.authorId as string;
    if (filter.contentTypes) {
      where.contentType = { in: filter.contentTypes as string[] };
    } else if (filter.contentType) {
      where.contentType = filter.contentType as string;
    }
    if (filter.createdAt) {
      const range = filter.createdAt as Record<string, string>;
      where.createdAt = {};
      if (range['>=']) where.createdAt.gte = new Date(range['>=']);
      if (range['<=']) where.createdAt.lte = new Date(range['<=']);
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.searchIndex.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      }),
      this.prisma.searchIndex.count({ where }),
    ]);

    return {
      hits: rows.map((item) => ({
        id: item.id,
        score: 1.0,
        document: {
          id: item.id,
          contentType: item.contentType,
          contentId: item.contentId,
          serverId: item.serverId,
          channelId: item.channelId,
          authorId: item.authorId,
          content: item.searchableText,
          metadata: item.metadata,
          createdAt: item.createdAt,
        } as any,
      })),
      estimatedTotalHits: total,
      processingTimeMs: 0,
    };
  }

  // ============ E2EE Search ============

  async searchE2EEMessages(
    userId: string,
    query: string,
    options: { sessionId?: string; groupId?: string; limit?: number } = {},
  ): Promise<SearchResult[]> {
    // E2EE messages cannot be searched server-side
    // This endpoint returns a signal to the client to perform local search
    // The client maintains an encrypted local search index

    return [
      {
        id: 'client_side_search_required',
        contentType: 'e2ee_message',
        contentId: '',
        content:
          'E2EE messages must be searched client-side. Use the local encrypted index.',
        score: 0,
        metadata: { clientSideSearch: true, query },
        createdAt: new Date(),
      },
    ];
  }

  // ============ Faceted Search ============

  private buildFacets(facets: Record<string, Record<string, number>>) {
    return {
      servers: facets.serverId || {},
      channels: facets.channelId || {},
      authors: facets.authorId || {},
      contentTypes: facets.contentType || {},
      dateHistogram: this.buildDateHistogram(facets.createdAt || {}),
    };
  }

  private buildDateHistogram(
    dateFacet: Record<string, number>,
  ): Record<string, number> {
    // Convert date facet to histogram buckets (daily)
    const histogram: Record<string, number> = {};
    for (const [date, count] of Object.entries(dateFacet)) {
      const day = date.split('T')[0]; // YYYY-MM-DD
      histogram[day] = (histogram[day] || 0) + count;
    }
    return histogram;
  }

  private mapHitToResult(hit: SearchHit): SearchResult {
    const doc = hit.document;
    return {
      id: hit.id,
      contentType: doc.contentType,
      contentId: doc.contentId,
      serverId: doc.serverId,
      channelId: doc.channelId,
      authorId: doc.authorId,
      title: doc.title,
      content: doc.content,
      highlights: hit.highlights,
      score: hit.score,
      metadata: doc.metadata,
      createdAt: new Date(doc.createdAt),
    };
  }

  // ============ Authorization ============

  private async authorizeSearch(options: AdvancedSearchOptions): Promise<void> {
    if (options.serverId) {
      // Check if user is member of server
      const membership = await this.prisma.serverMember.findUnique({
        where: {
          serverId_userId: {
            serverId: options.serverId,
            userId: options.userId,
          },
        },
      });
      if (!membership) {
        throw new Error('Not a member of this server');
      }
    }
    if (options.channelId) {
      // Check if user has access to channel
      const channel = await this.prisma.serverChannel.findUnique({
        where: { id: options.channelId },
      });
      if (!channel) throw new Error('Channel not found');

      const membership = await this.prisma.serverMember.findUnique({
        where: {
          serverId_userId: {
            serverId: channel.serverId,
            userId: options.userId,
          },
        },
      });
      if (!membership) throw new Error('Not a member of this server');
    }
  }

  // ============ Logging & Analytics ============

  private async incrementUserHitCounts(results: SearchResults): Promise<void> {
    const userHits = results.hits.filter(
      (hit) => hit.document?.contentType === 'user' && hit.document?.contentId,
    );
    if (userHits.length === 0) return;

    const counts = await Promise.all(
      userHits.map((hit) =>
        this.indexRepo
          .incrementUserSearchCount(hit.document.contentId)
          .then((count) => ({ hit, count })),
      ),
    );

    for (const { hit, count } of counts) {
      if (count > 0) {
        hit.document.metadata = {
          ...(hit.document.metadata || {}),
          searchCount: count,
        };
      }
    }
  }

  private async logSearchQuery(
    userId: string,
    query: string,
    results: SearchResults,
  ): Promise<void> {
    await this.indexRepo.createQuery({
      user: { connect: { id: userId } },
      queryText: query,
      resultCount: results.hits.length,
      latencyMs: results.processingTimeMs,
      engine: this.useMeilisearch ? 'meilisearch' : 'postgres',
    });

    // Update daily analytics
    await this.indexRepo.upsertDailyAnalytics(
      new Date(),
      this.useMeilisearch ? 'meilisearch' : 'postgres',
      {
        totalIncrement: 1,
        uniqueIncrement: 1, // Simplified - would need proper distinct count
        avgLatencyMs: results.processingTimeMs,
      },
    );
  }

  // ============ Search Suggestions ============

  async getSearchSuggestions(
    userId: string,
    partialQuery: string,
    limit = 5,
  ): Promise<SearchSuggestion[]> {
    // Get from user's search history
    const recentQueries = await this.indexRepo.findQueriesByUser(userId, {
      limit: 50,
    });

    // Filter by prefix
    const suggestions = recentQueries
      .filter((q) =>
        q.queryText.toLowerCase().startsWith(partialQuery.toLowerCase()),
      )
      .slice(0, limit)
      .map((q) => ({ query: q.queryText, count: 1 }));

    // Add popular queries from analytics
    const popularQueries = await this.getPopularQueries(
      limit - suggestions.length,
      this.useMeilisearch ? 'meilisearch' : 'postgres',
    );

    return [...suggestions, ...popularQueries];
  }

  async getSearchHistory(
    userId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const history = await this.indexRepo.findQueriesByUser(userId, options);
    return { success: true, history };
  }

  private async getPopularQueries(
    limit: number,
    engine?: string,
  ): Promise<SearchSuggestion[]> {
    if (limit <= 0) return [];
    const analytics = await this.indexRepo.findAnalytics(
      engine,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    const queryCounts: Record<string, number> = {};
    for (const day of analytics) {
      if (day.topQueries) {
        for (const [query, count] of Object.entries(
          day.topQueries as Record<string, number>,
        )) {
          queryCounts[query] = (queryCounts[query] || 0) + count;
        }
      }
    }

    return Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  }

  // ============ Search Analytics ============

  async getSearchAnalytics(
    engine: string | undefined,
    days = 30,
  ): Promise<{
    totalSearches: number;
    uniqueUsers: number;
    avgLatencyMs: number;
    topQueries: SearchSuggestion[];
    searchesPerDay: Record<string, number>;
    topSearchedUsers: {
      contentId: string;
      username: string;
      displayName: string;
      searchCount: number;
    }[];
  }> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const to = new Date();

    const [analytics, topSearchedUsers] = await Promise.all([
      this.indexRepo.findAnalytics(engine, from, to),
      this.indexRepo.getTopSearchedUsers(10),
    ]);

    let totalSearches = 0;
    let uniqueUsers = 0;
    let totalLatency = 0;
    const searchesPerDay: Record<string, number> = {};
    const queryCounts: Record<string, number> = {};

    for (const day of analytics) {
      totalSearches += day.totalSearches;
      totalLatency += day.avgLatencyMs * day.totalSearches;
      searchesPerDay[day.date.toISOString().split('T')[0]] =
        (searchesPerDay[day.date.toISOString().split('T')[0]] || 0) +
        day.totalSearches;

      if (day.topQueries) {
        for (const [query, count] of Object.entries(
          day.topQueries as Record<string, number>,
        )) {
          queryCounts[query] = (queryCounts[query] || 0) + count;
        }
      }
    }

    // Engine stats are sparse when searches come from raw SearchQuery rows,
    // so aggregate authoritative counts directly from the query log too.
    const queryLog = await this.prisma.searchQuery.findMany({
      where: {
        ...(engine ? { engine } : {}),
        createdAt: { gte: from, lte: to },
      },
      select: {
        userId: true,
        queryText: true,
        latencyMs: true,
        createdAt: true,
      },
    });
    const uniqueQueryUsers = new Set(queryLog.map((q) => q.userId));

    // Use the denser source: search events from the query log
    totalSearches = Math.max(totalSearches, queryLog.length);
    uniqueUsers = Math.max(uniqueUsers, uniqueQueryUsers.size);
    totalLatency = Math.max(
      totalLatency,
      queryLog.reduce((sum, q) => sum + q.latencyMs, 0),
    );
    for (const q of queryLog) {
      const day = q.createdAt.toISOString().split('T')[0];
      searchesPerDay[day] = (searchesPerDay[day] || 0) + 1;
      const key = q.queryText.trim() || '(empty)';
      queryCounts[key] = (queryCounts[key] || 0) + 1;
    }

    return {
      totalSearches,
      uniqueUsers,
      avgLatencyMs: totalSearches > 0 ? totalLatency / totalSearches : 0,
      topQueries: Object.entries(queryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
      searchesPerDay,
      topSearchedUsers,
    };
  }

  // ============ Reindexing ============

  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    let indexed = 0;
    let errors = 0;

    // Users
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    for (const u of users) {
      try {
        await this.indexUser(u.id, {
          username: u.username,
          displayName: u.displayName,
          bio: u.bio || undefined,
          avatarUrl: u.avatarUrl || undefined,
          createdAt: u.createdAt,
        });
        indexed++;
      } catch {
        errors++;
      }
    }

    // Servers
    const servers = await this.prisma.server.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });
    for (const s of servers) {
      try {
        await this.indexServer(s.id, {
          name: s.name,
          description: s.description || undefined,
          memberCount: s._count.members,
          createdAt: s.createdAt,
        });
        indexed++;
      } catch {
        errors++;
      }
    }

    // Channels
    const channels = await this.prisma.serverChannel.findMany({
      select: {
        id: true,
        serverId: true,
        name: true,
        description: true,
        type: true,
        createdAt: true,
      },
    });
    for (const c of channels) {
      try {
        await this.indexChannel(c.id, {
          serverId: c.serverId,
          name: c.name,
          description: c.description || undefined,
          type: c.type,
          createdAt: c.createdAt,
        });
        indexed++;
      } catch {
        errors++;
      }
    }

    // Direct messages
    const dms = await this.prisma.directMessage.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        authorUserId: true,
        content: true,
        createdAt: true,
      },
      take: 10000,
    });
    for (const dm of dms) {
      try {
        await this.indexDirectMessage(dm.id, {
          authorId: dm.authorUserId,
          content: dm.content,
          createdAt: dm.createdAt,
        });
        indexed++;
      } catch {
        errors++;
      }
    }

    // Channel messages
    const messages = await this.prisma.channelMessage.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        serverId: true,
        channelId: true,
        authorMemberId: true,
        content: true,
        createdAt: true,
      },
      take: 10000,
    });

    for (const msg of messages) {
      try {
        const author = await this.prisma.serverMember.findUnique({
          where: { id: msg.authorMemberId },
          select: { userId: true },
        });

        await this.indexChannelMessage(msg.id, {
          serverId: msg.serverId,
          channelId: msg.channelId,
          authorId: author?.userId || '',
          content: msg.content,
          createdAt: msg.createdAt,
        });
        indexed++;
      } catch (e) {
        errors++;
      }
    }

    return { indexed, errors };
  }
}
