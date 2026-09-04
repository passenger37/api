import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationWithDeliveries } from '../types/notification.types';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.NotificationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Notification> {
    const client = tx ?? this.prisma;

    return client.notification.create({ data });
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationWithDeliveries | null> {
    const client = tx ?? this.prisma;

    return client.notification.findUnique({
      where: { id },
      include: {
        deliveries: true,
      },
    });
  }

  async findByDedupeKey(
    recipientUserId: string,
    dedupeKey: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: {
        recipientUserId_dedupeKey: {
          recipientUserId,
          dedupeKey,
        },
      },
    });
  }

  async findPage(
    recipientUserId: string,
    cursor?: string,
    limit = 50,
  ): Promise<NotificationWithDeliveries[]> {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId,
      },

      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,

      include: {
        deliveries: true,
      },
    });
  }

  async countUnread(recipientUserId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientUserId,
        readAt: null,
      },
    });
  }

  async markRead(
    id: string,
    recipientUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationWithDeliveries | null> {
    const client = tx ?? this.prisma;

    const result = await client.notification.updateMany({
      where: {
        id,
        recipientUserId,
        readAt: null,
      },

      data: {
        readAt: new Date(),
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tx);
  }

  async markAllRead(
    recipientUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.notification.updateMany({
      where: {
        recipientUserId,
        readAt: null,
      },

      data: {
        readAt: new Date(),
      },
    });

    return result.count;
  }
}
