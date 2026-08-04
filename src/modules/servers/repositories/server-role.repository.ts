import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServerRoleRepository {
  async createDefaultRoles(
    serverId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    // Module 25
  }
}