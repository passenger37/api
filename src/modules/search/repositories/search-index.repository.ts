import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  SearchIndex,
  SearchQuery,
  SearchAnalytics,
  Prisma,
} from '@prisma/client';

@Injectable()
export class SearchIndexRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIndex(
    data: Prisma.SearchIndexCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SearchIndex> {
    const client = tx ?? this.prisma;
    return client.searchIndex.create({ data });
  }

  async upsertIndex(
    contentType: string,
    contentId: string,
    data: Prisma.SearchIndexUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SearchIndex> {
    const client = tx ?? this.prisma;
    return client.searchIndex.upsert({
      where: { contentType_contentId: { contentType, contentId } },
      create: {
        contentType,
        contentId,
        ...data,
      } as Prisma.SearchIndexCreateInput,
      update: data,
    });
  }

  async findById(id: string): Promise<SearchIndex | null> {
    return this.prisma.searchIndex.findUnique({ where: { id } });
  }

  async findByContent(
    contentType: string,
    contentId: string,
  ): Promise<SearchIndex | null> {
    return this.prisma.searchIndex.findUnique({
      where: { contentType_contentId: { contentType, contentId } },
    });
  }

  async findByServer(
    serverId: string,
    options?: { limit?: number; cursor?: string; contentType?: string },
  ): Promise<SearchIndex[]> {
    return this.prisma.searchIndex.findMany({
      where: {
        serverId,
        ...(options?.contentType && { contentType: options.contentType }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async findByChannel(
    channelId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<SearchIndex[]> {
    return this.prisma.searchIndex.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async findByAuthor(
    authorId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<SearchIndex[]> {
    return this.prisma.searchIndex.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async deleteIndex(contentType: string, contentId: string): Promise<void> {
    await this.prisma.searchIndex.delete({
      where: { contentType_contentId: { contentType, contentId } },
    });
  }

  // Search Queries
  async createQuery(
    data: Prisma.SearchQueryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SearchQuery> {
    const client = tx ?? this.prisma;
    return client.searchQuery.create({ data });
  }

  async findQueriesByUser(
    userId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<SearchQuery[]> {
    return this.prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  // Search Analytics
  async upsertDailyAnalytics(
    date: Date,
    engine: string,
    data: {
      totalIncrement?: number;
      uniqueIncrement?: number;
      avgLatencyMs?: number;
      topQueries?: Prisma.InputJsonValue;
      zeroResultRate?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<SearchAnalytics> {
    const client = tx ?? this.prisma;
    const totalIncrement = data.totalIncrement ?? 0;
    const uniqueIncrement = data.uniqueIncrement ?? 0;
    const avgLatencyMs = data.avgLatencyMs ?? 0;
    const topQueries = data.topQueries;
    const zeroResultRate = data.zeroResultRate;

    return client.searchAnalytics.upsert({
      where: { date_engine: { date, engine } },
      create: {
        date,
        engine,
        totalSearches: totalIncrement,
        uniqueUsers: uniqueIncrement,
        avgLatencyMs,
        ...(topQueries !== undefined && { topQueries }),
        ...(zeroResultRate !== undefined && { zeroResultRate }),
      },
      update: {
        totalSearches: { increment: totalIncrement },
        uniqueUsers: { increment: uniqueIncrement },
        avgLatencyMs,
        ...(topQueries !== undefined && { topQueries }),
        ...(zeroResultRate !== undefined && { zeroResultRate }),
      },
    });
  }

  async findAnalytics(
    engine: string,
    from: Date,
    to: Date,
  ): Promise<SearchAnalytics[]> {
    return this.prisma.searchAnalytics.findMany({
      where: { engine, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }
}
