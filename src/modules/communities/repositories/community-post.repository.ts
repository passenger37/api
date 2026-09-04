import { Injectable } from '@nestjs/common';
import { CommunityPost, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommunityPostWithRelations } from '../types/community.types';

@Injectable()
export class CommunityPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityPostCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPost> {
    const client = tx ?? this.prisma;

    return client.communityPost.create({ data });
  }

  async findById(id: string): Promise<CommunityPostWithRelations | null> {
    return this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
    });
  }

  async findPage(
    communityId: string,
    limit: number,
    cursor?: string,
  ): Promise<CommunityPostWithRelations[]> {
    return this.prisma.communityPost.findMany({
      where: { communityId, isDeleted: false },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
  }

  async findPageByCategory(
    communityId: string,
    categoryId: string,
    limit: number,
    cursor?: string,
  ): Promise<CommunityPostWithRelations[]> {
    return this.prisma.communityPost.findMany({
      where: { communityId, categoryId, isDeleted: false },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
  }

  async update(
    id: string,
    data: Prisma.CommunityPostUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPost> {
    const client = tx ?? this.prisma;

    return client.communityPost.update({ where: { id }, data });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityPost.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async countByCommunity(communityId: string): Promise<number> {
    return this.prisma.communityPost.count({
      where: { communityId, isDeleted: false },
    });
  }
}
