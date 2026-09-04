import { Injectable } from '@nestjs/common';
import {
  NotificationDelivery,
  NotificationDeliveryStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.NotificationDeliveryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationDelivery> {
    const client = tx ?? this.prisma;

    return client.notificationDelivery.create({ data });
  }

  async findPending(limit = 100): Promise<
    Prisma.NotificationDeliveryGetPayload<{
      include: { notification: true };
    }>[]
  > {
    return this.prisma.notificationDelivery.findMany({
      where: {
        status: NotificationDeliveryStatus.PENDING,
      },

      orderBy: {
        createdAt: 'asc',
      },

      take: limit,

      include: {
        notification: true,
      },
    });
  }

  async markDelivered(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.notificationDelivery.update({
      where: { id },
      data: {
        status: NotificationDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        failedAt: null,
        lastError: null,
      },
    });
  }

  async recordFailure(
    id: string,
    error: string,
    retryCount: number,
    maxAttempts: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.notificationDelivery.update({
      where: { id },
      data: {
        status:
          retryCount >= maxAttempts
            ? NotificationDeliveryStatus.FAILED
            : NotificationDeliveryStatus.PENDING,
        failedAt: new Date(),
        lastError: error,
        retryCount,
      },
    });
  }
}
