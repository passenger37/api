import { Injectable } from '@nestjs/common';
import { CommunityCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class CommunityCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CommunityCategoryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityCategory> {
    const client = tx ?? this.prisma;

    return client.communityCategory.create({ data });
  }

  async list(communityId: string): Promise<CommunityCategory[]> {
    return this.prisma.communityCategory.findMany({
      where: { communityId },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string): Promise<CommunityCategory | null> {
    return this.prisma.communityCategory.findUnique({ where: { id } });
  }

  async findByName(
    communityId: string,
    name: string,
  ): Promise<CommunityCategory | null> {
    return this.prisma.communityCategory.findFirst({
      where: { communityId, name },
    });
  }

  async update(
    id: string,
    data: Prisma.CommunityCategoryUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityCategory> {
    const client = tx ?? this.prisma;

    return client.communityCategory.update({ where: { id }, data });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.communityCategory.delete({ where: { id } });
  }
}
