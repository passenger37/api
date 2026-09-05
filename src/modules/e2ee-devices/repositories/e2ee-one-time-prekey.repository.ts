import { Injectable } from '@nestjs/common';
import { E2eeOneTimePreKey, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class E2eeOneTimePreKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addBatch(
    deviceId: string,
    keys: Array<{
      preKeyId: number;
      publicKey: string;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.e2eeOneTimePreKey.createMany({
      data: keys.map((key) => ({
        deviceId,
        ...key,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async countUnconsumed(
    deviceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    return client.e2eeOneTimePreKey.count({
      where: {
        deviceId,
        isConsumed: false,
      },
    });
  }

  async consumeNext(
    deviceId: string,
    tx?: Prisma.TransactionClient,
    attempts = 10,
  ): Promise<E2eeOneTimePreKey | null> {
    const client = tx ?? this.prisma;

    const candidate = await client.e2eeOneTimePreKey.findFirst({
      where: {
        deviceId,
        isConsumed: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 1,
    });

    if (!candidate) {
      return null;
    }

    const claimed = await client.e2eeOneTimePreKey.updateMany({
      where: {
        id: candidate.id,
        isConsumed: false,
      },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      if (attempts <= 0) {
        return null;
      }

      return this.consumeNext(deviceId, tx, attempts - 1);
    }

    return candidate;
  }

  async markConsumed(preKeyId: string): Promise<void> {
    await this.prisma.e2eeOneTimePreKey.update({
      where: { id: preKeyId },
      data: { isConsumed: true, consumedAt: new Date() },
    });
  }
}
