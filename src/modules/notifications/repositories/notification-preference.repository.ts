import { Injectable } from '@nestjs/common';
import {
  NotificationPreference,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    userId: string,
    notificationType: NotificationType,
    data: {
      inAppEnabled?: boolean;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationPreference> {
    const client = tx ?? this.prisma;

    return client.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },

      create: {
        userId,
        notificationType,
        inAppEnabled:
          data.inAppEnabled !== undefined ? data.inAppEnabled : true,
        pushEnabled: data.pushEnabled !== undefined ? data.pushEnabled : true,
        emailEnabled:
          data.emailEnabled !== undefined ? data.emailEnabled : true,
      },

      update: {
        inAppEnabled: data.inAppEnabled,
        pushEnabled: data.pushEnabled,
        emailEnabled: data.emailEnabled,
      },
    });
  }

  async find(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
    });
  }

  async findManyByUser(userId: string): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: {
        userId,
      },

      orderBy: {
        notificationType: 'asc',
      },
    });
  }

  async findByTypes(
    userId: string,
    types: NotificationType[],
  ): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: {
        userId,
        notificationType: {
          in: types,
        },
      },
    });
  }
}
