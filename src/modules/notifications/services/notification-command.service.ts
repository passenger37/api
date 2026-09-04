import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationDeliveryChannel,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import {
  NotificationAccessDeniedException,
  NotificationNotFoundException,
} from '../exceptions/notification.exceptions';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import {
  CreateNotificationOptions,
  NotificationWithDeliveries,
} from '../types/notification.types';

export interface CreateNotificationResult {
  notification: Notification;
  deliveryId: string;
  deduplicated: boolean;
}

@Injectable()
export class NotificationCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepository: NotificationRepository,
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly deliveryRepository: NotificationDeliveryRepository,
    @Inject(forwardRef(() => NotificationDeliveryService))
    private readonly deliveryService: NotificationDeliveryService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway,
  ) {}

  async create(
    options: CreateNotificationOptions,
  ): Promise<CreateNotificationResult> {
    if (options.dedupeKey) {
      const existing = await this.notificationRepository.findByDedupeKey(
        options.recipientUserId,
        options.dedupeKey,
      );

      if (existing) {
        return {
          notification: existing,
          deliveryId: '',
          deduplicated: true,
        };
      }
    }

    const channels = await this.resolveChannels(
      options.recipientUserId,
      options.type,
      options.channels,
    );

    const { notification, inAppDeliveryId } = await this.prisma.$transaction(
      async (tx) => {
        const notification = await this.notificationRepository.create(
          {
            recipientUserId: options.recipientUserId,
            actorUserId: options.actorUserId ?? null,
            type: options.type,
            entityType: options.entityType,
            entityId: options.entityId,
            payload: options.payload as Prisma.InputJsonValue,
            dedupeKey: options.dedupeKey ?? null,
            expiresAt: options.expiresAt ?? null,
          },
          tx,
        );

        let inAppId = '';

        for (const channel of channels) {
          const delivery = await this.deliveryRepository.create(
            {
              channel,
              notification: {
                connect: {
                  id: notification.id,
                },
              },
            },
            tx,
          );

          if (channel === NotificationDeliveryChannel.IN_APP) {
            inAppId = delivery.id;
          }
        }

        return {
          notification,
          inAppDeliveryId: inAppId,
        };
      },
    );

    if (inAppDeliveryId) {
      await this.deliveryService.handleNew(notification, inAppDeliveryId);
    }

    return {
      notification,
      deliveryId: inAppDeliveryId,
      deduplicated: false,
    };
  }

  async markRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationWithDeliveries> {
    const existing = await this.notificationRepository.findById(notificationId);

    if (!existing) {
      throw new NotificationNotFoundException();
    }

    if (existing.recipientUserId !== userId) {
      throw new NotificationAccessDeniedException();
    }

    const updated = await this.notificationRepository.markRead(
      notificationId,
      userId,
    );

    if (!updated) {
      return existing;
    }

    await this.refreshUnreadCount(userId);

    this.gateway.broadcastRead(userId, notificationId);

    return updated;
  }

  async markAllRead(userId: string): Promise<number> {
    const affected = await this.notificationRepository.markAllRead(userId);

    if (affected > 0) {
      await this.refreshUnreadCount(userId);
      this.gateway.broadcastReadAll(userId);
    }

    return affected;
  }

  private async refreshUnreadCount(userId: string): Promise<void> {
    const count = await this.notificationRepository.countUnread(userId);

    await this.deliveryService.setUnreadCount(userId, count);
  }

  private async resolveChannels(
    userId: string,
    type: CreateNotificationOptions['type'],
    requested?: NotificationDeliveryChannel[],
  ): Promise<NotificationDeliveryChannel[]> {
    const preference = await this.preferenceRepository.find(userId, type);

    const inAppEnabled = preference?.inAppEnabled ?? true;

    if (requested && requested.length > 0) {
      if (inAppEnabled) {
        return [...new Set(requested)];
      }

      return requested.filter(
        (channel) => channel !== NotificationDeliveryChannel.IN_APP,
      );
    }

    return inAppEnabled ? [NotificationDeliveryChannel.IN_APP] : [];
  }
}
