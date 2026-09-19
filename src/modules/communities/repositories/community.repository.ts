import { Injectable } from '@nestjs/common';
import { Community, CommunityVisibility, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { TwoFieldCursor } from '../pagination/community-cursor';
import {
  CommunityWithCounts,
  CommunitySubscriptionWithCommunity,
} from '../types/community.types';

@Injectable()
export class CommunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Community> {
    const client = tx ?? this.prisma;

    return client.community.create({ data });
  }

  async findById(id: string): Promise<CommunityWithCounts | null> {
    return this.prisma.community.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true, subscriptions: true },
        },
      },
    });
  }

  /**
   * Cheap lookup used by access checks — only fetches id and ownerId.
   */
  async findOwnerId(id: string): Promise<string | null> {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    return community?.ownerId ?? null;
  }

  async findBySlug(
    slug: string,
    visibility?: CommunityVisibility,
  ): Promise<Community | null> {
    return this.prisma.community.findFirst({
      where: { slug, ...(visibility ? { visibility } : {}) },
    });
  }

  async findByServerId(serverId: string): Promise<Community | null> {
    return this.prisma.community.findFirst({ where: { serverId } });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true },
    });

    return Boolean(community);
  }

  async update(
    id: string,
    data: Prisma.CommunityUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Community> {
    const client = tx ?? this.prisma;

    return client.community.update({ where: { id }, data });
  }

  /**
   * Hide a community from public discovery without removing it.
   * Sets visibility to PRIVATE and disables discovery.
   * The row remains queryable for owners/moderators/subscribers.
   */
  async hideFromDiscovery(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.community.update({
      where: { id },
      data: {
        discoveryEnabled: false,
        visibility: CommunityVisibility.PRIVATE,
      },
    });
  }

  async findBySlugWithRelations(
    slug: string,
  ): Promise<CommunityWithCounts | null> {
    return this.prisma.community.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true, subscriptions: true },
        },
      },
    });
  }

  async listSubscribed(
    userId: string,
    limit: number,
    cursor?: TwoFieldCursor,
  ): Promise<CommunitySubscriptionWithCommunity[]> {
    return this.prisma.communitySubscription.findMany({
      where: {
        userId,
        ...this.subscribedCursorWhere(cursor),
      },
      include: { community: true },
      orderBy: [{ subscribedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }

  async discoverPublic(
    query: string | undefined,
    limit: number,
    cursor?: string,
  ): Promise<CommunityWithCounts[]> {
    const where: Prisma.CommunityWhereInput = {
      visibility: CommunityVisibility.PUBLIC,
      discoveryEnabled: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.community.findMany({
      where,
      include: {
        _count: {
          select: { posts: true, subscriptions: true },
        },
      },
      orderBy: [{ subscriptions: { _count: 'desc' } }, { id: 'desc' }],
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
  }

  async countDiscoverable(query: string | undefined): Promise<number> {
    const where: Prisma.CommunityWhereInput = {
      visibility: CommunityVisibility.PUBLIC,
      discoveryEnabled: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.community.count({ where });
  }

  private subscribedCursorWhere(
    cursor?: TwoFieldCursor,
  ): Prisma.CommunitySubscriptionWhereInput {
    if (!cursor) {
      return {};
    }

    return {
      OR: [
        { subscribedAt: { lt: cursor.createdAt } },
        {
          AND: [{ subscribedAt: cursor.createdAt }, { id: { lt: cursor.id } }],
        },
      ],
    };
  }
}
