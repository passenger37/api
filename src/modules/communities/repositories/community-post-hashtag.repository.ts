import { Injectable } from '@nestjs/common';
import { CommunityPostHashtag, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommunityPostHashtagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    postId: string,
    tags: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostHashtag[]> {
    const client = tx ?? this.prisma;

    const normalized = [...new Set(tags.map((t) => t.replace(/^#/, '').toLowerCase()))];

    const creates = normalized.map((tag) =>
      client.communityPostHashtag.create({
        data: { postId, tag },
      }),
    );

    if (tx) {
      return Promise.all(creates);
    }
    return this.prisma.$transaction(creates);
  }

  async listByPost(postId: string): Promise<CommunityPostHashtag[]> {
    return this.prisma.communityPostHashtag.findMany({
      where: { postId },
      orderBy: { tag: 'asc' },
    });
  }

  async replaceForPost(
    postId: string,
    tags: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostHashtag[]> {
    const client = tx ?? this.prisma;

    if (tx) {
      await client.communityPostHashtag.deleteMany({ where: { postId } });
      return this.createMany(postId, tags, tx);
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.communityPostHashtag.deleteMany({ where: { postId } });
      return this.createMany(postId, tags, transaction);
    });
  }

  async findByTag(
    tag: string,
    limit: number,
  ): Promise<Array<{ postId: string }>> {
    const normalized = tag.replace(/^#/, '').toLowerCase();

    return this.prisma.communityPostHashtag.findMany({
      where: { tag: normalized },
      select: { postId: true },
      take: limit,
      orderBy: { postId: 'asc' },
    });
  }

  async removeByPost(
    postId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.communityPostHashtag.deleteMany({
      where: { postId },
    });

    return result.count;
  }
}