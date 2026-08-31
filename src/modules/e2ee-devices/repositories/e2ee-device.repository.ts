import { Injectable } from '@nestjs/common';
import { E2eeDevice, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

const DEVICE_WITH_KEYS_INCLUDE = {
  signedPreKeys: {
    where: {
      isActive: true,
    },
    take: 1,
  },
  _count: {
    select: {
      oneTimePreKeys: {
        where: {
          isConsumed: false,
        },
      },
    },
  },
} satisfies Prisma.E2eeDeviceInclude;

export type DeviceWithKeys = Prisma.E2eeDeviceGetPayload<{
  include: typeof DEVICE_WITH_KEYS_INCLUDE;
}>;

@Injectable()
export class E2eeDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      userId: string;
      name: string;
      platform: string;
      identityKeyPublic: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<DeviceWithKeys> {
    const client = tx ?? this.prisma;

    return client.e2eeDevice.create({
      data,
      include: DEVICE_WITH_KEYS_INCLUDE,
    });
  }

  async findById(deviceId: string): Promise<E2eeDevice | null> {
    return this.prisma.e2eeDevice.findUnique({
      where: {
        id: deviceId,
      },
    });
  }

  async findActiveById(deviceId: string): Promise<E2eeDevice | null> {
    return this.prisma.e2eeDevice.findFirst({
      where: {
        id: deviceId,
        isRevoked: false,
      },
    });
  }

  async findByUserId(userId: string): Promise<DeviceWithKeys[]> {
    return this.prisma.e2eeDevice.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: DEVICE_WITH_KEYS_INCLUDE,
    });
  }

  async countForUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    return client.e2eeDevice.count({
      where: {
        userId,
        isRevoked: false,
      },
    });
  }

  async markRevoked(
    deviceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.e2eeDevice.update({
      where: {
        id: deviceId,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }
}
