import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerCategoryCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverCategory.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.serverCategory.findUnique({
      where: {
        id,
      },
    });
  }
}
