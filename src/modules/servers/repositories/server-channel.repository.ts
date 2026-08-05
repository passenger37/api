import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerChannelCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverChannel.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.serverChannel.findUnique({
      where: {
        id,
      },
    });
  }
}
