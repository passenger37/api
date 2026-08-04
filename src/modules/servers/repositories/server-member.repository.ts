import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerMemberRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createOwnerMembership(
    serverId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.serverMember.create({
      data: {
        serverId,
        userId,
      },
    });
  }
}