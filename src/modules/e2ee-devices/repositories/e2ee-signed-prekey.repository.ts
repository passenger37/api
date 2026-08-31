import { Injectable } from '@nestjs/common';
import { E2eeSignedPreKey, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class E2eeSignedPreKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createInitial(
    deviceId: string,
    key: {
      signedPreKeyId: number;
      publicKey: string;
      signature: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeSignedPreKey> {
    const client = tx ?? this.prisma;

    return client.e2eeSignedPreKey.create({
      data: {
        deviceId,
        ...key,
        isActive: true,
      },
    });
  }

  async findActive(deviceId: string): Promise<E2eeSignedPreKey | null> {
    return this.prisma.e2eeSignedPreKey.findFirst({
      where: {
        deviceId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async rotate(
    deviceId: string,
    key: {
      signedPreKeyId: number;
      publicKey: string;
      signature: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeSignedPreKey> {
    const client = tx ?? this.prisma;

    await client.e2eeSignedPreKey.updateMany({
      where: {
        deviceId,
        isActive: true,
      },
      data: {
        isActive: false,
        rotatedAt: new Date(),
      },
    });

    return client.e2eeSignedPreKey.create({
      data: {
        deviceId,
        ...key,
        isActive: true,
      },
    });
  }
}
