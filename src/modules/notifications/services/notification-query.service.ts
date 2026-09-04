import { forwardRef, Inject, Injectable } from '@nestjs/common';

import {
  NotificationAccessDeniedException,
  NotificationNotFoundException,
} from '../exceptions/notification.exceptions';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDeliveryService } from './notification-delivery.service';
import { serializeNotification } from '../mappers/notification.mapper';
import { NotificationWithDeliveries } from '../types/notification.types';
import {
  NOTIFICATION_DEFAULT_PAGE_SIZE,
  NOTIFICATION_MAX_PAGE_SIZE,
} from '../constants/notification.constants';

export interface NotificationPage {
  items: Array<ReturnType<typeof serializeNotification>>;
  nextCursor: string | null;
}

@Injectable()
export class NotificationQueryService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    @Inject(forwardRef(() => NotificationDeliveryService))
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  async list(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<NotificationPage> {
    const pageSize = Math.min(
      Math.max(limit ?? NOTIFICATION_DEFAULT_PAGE_SIZE, 1),
      NOTIFICATION_MAX_PAGE_SIZE,
    );

    const notifications = await this.notificationRepository.findPage(
      userId,
      cursor,
      pageSize,
    );

    const nextCursor =
      notifications.length === pageSize
        ? (notifications[notifications.length - 1]?.id ?? null)
        : null;

    return {
      items: notifications.map(serializeNotification),
      nextCursor,
    };
  }

  async get(
    notificationId: string,
    userId: string,
  ): Promise<NotificationWithDeliveries> {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotificationNotFoundException();
    }

    if (notification.recipientUserId !== userId) {
      throw new NotificationAccessDeniedException();
    }

    return notification;
  }

  async unreadCount(userId: string): Promise<number> {
    const cached = await this.deliveryService.getUnreadCount(userId);

    if (cached !== null) {
      return cached;
    }

    const count = await this.notificationRepository.countUnread(userId);

    await this.deliveryService.setUnreadCount(userId, count);

    return count;
  }
}
