import { Injectable } from '@nestjs/common';
import { Prisma, PostShare, ShareDestinationType } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';

@Injectable()
export class PostShareRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      postId: string;
      actorUserId: string;
      destinationType: ShareDestinationType;
      destinationId?: string;
      clientRequestId?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PostShare> {
    const client = tx ?? this.prisma;

    return client.postShare.create({
      data,
    });
  }

  async findById(id: string): Promise<PostShare | null> {
    return this.prisma.postShare.findUnique({
      where: { id },
    });
  }

  async findByIdempotencyKey(actorUserId: string, clientRequestId: string): Promise<PostShare | null> {
    return this.prisma.postShare.findUnique({
      where: {
        actorUserId_clientRequestId: {
          actorUserId,
          clientRequestId,
        },
      },
    });
  }

  async countShares(postId: string): Promise<number> {
    return this.prisma.postShare.count({
      where: { postId },
    });
  }

  async findSharesByPost(
    postId: string,
    options: {
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
    },
  ): Promise<{ items: PostShare[]; nextCursor: { createdAt: Date; id: string } | null }> {
    const where: Prisma.PostShareWhereInput = { postId };

    if (options.cursor) {
      where.createdAt = { lt: options.cursor.createdAt };
    }

    const shares = await this.prisma.postShare.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = shares.length > options.limit;
    const items = hasMore ? shares.slice(0, options.limit) : shares;
    const nextCursor = hasMore && items.length > 0
      ? { createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id }
      : null;

    return { items, nextCursor };
  }
}