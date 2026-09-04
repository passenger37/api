import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Notification } from '@prisma/client';

import { RedisService } from '../../../core/redis/redis.service';
import { REDIS_TTL, redisKeys } from '../../../core/redis/redis-keys';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { NOTIFICATION_MAX_RETRY_ATTEMPTS } from '../constants/notification.constants';

@Injectable()
export class NotificationDeliveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryService.name);

  private readonly intervalMs = 500;

  private timer?: NodeJS.Timeout;

  private retrying = false;

  constructor(
    private readonly redis: RedisService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway,
    private readonly deliveryRepository: NotificationDeliveryRepository,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.retryPending(), this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async handleNew(
    notification: Notification,
    deliveryId: string,
  ): Promise<void> {
    // Increment the realtime unread counter.
    await this.redis.incr(
      redisKeys.notificationUnread(notification.recipientUserId),
    );

    await this.redis.expire(
      redisKeys.notificationUnread(notification.recipientUserId),
      REDIS_TTL.NOTIFICATION_UNREAD,
    );

    // Fan out the durable notification to the recipient's sockets.
    this.gateway.broadcastNotification(notification.recipientUserId, {
      id: notification.id,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId,
      payload: notification.payload,
      createdAt: notification.createdAt.toISOString(),
    });

    await this.deliveryRepository.markDelivered(deliveryId);
  }

  async setUnreadCount(userId: string, count: number): Promise<void> {
    await this.redis.set(
      redisKeys.notificationUnread(userId),
      String(count),
      REDIS_TTL.NOTIFICATION_UNREAD,
    );
  }

  async getUnreadCount(userId: string): Promise<number | null> {
    const value = await this.redis.get(redisKeys.notificationUnread(userId));

    if (value === null) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  async retryPending(): Promise<void> {
    if (this.retrying) {
      return;
    }

    this.retrying = true;

    try {
      const deliveries = await this.deliveryRepository.findPending();

      for (const delivery of deliveries) {
        const retryCount = delivery.retryCount + 1;

        try {
          this.gateway.broadcastNotification(
            delivery.notification.recipientUserId,
            {
              id: delivery.notification.id,
              type: delivery.notification.type,
              entityType: delivery.notification.entityType,
              entityId: delivery.notification.entityId,
              payload: delivery.notification.payload,
              createdAt: delivery.notification.createdAt.toISOString(),
            },
          );

          await this.deliveryRepository.markDelivered(delivery.id);
        } catch (error) {
          await this.deliveryRepository.recordFailure(
            delivery.id,
            error instanceof Error ? error.message : String(error),
            retryCount,
            NOTIFICATION_MAX_RETRY_ATTEMPTS,
          );
        }
      }
    } catch (error) {
      this.logger.error('Notification delivery retry polling failed.', error);
    } finally {
      this.retrying = false;
    }
  }
}
