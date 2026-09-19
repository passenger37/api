import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotificationEntityType, NotificationType } from '@prisma/client';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { DOMAIN_EVENT_CHANNEL } from '../../notifications/constants/notification.constants';
import { DomainNotificationEvent } from '../../notifications/types/notification.types';

/**
 * Publishes direct-message lifecycle domain events to the notifications bus
 * (`notifications:domain-events`). The direct-messages module never writes to
 * the notification store directly; NotificationEventListenerService consumes
 * these events.
 */
@Injectable()
export class DmNotificationPublisher {
  private readonly logger = new Logger(DmNotificationPublisher.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publishDirectMessage(input: {
    channelId: string;
    messageId: string;
    recipientUserId: string;
    actorUserId: string;
    content?: string;
  }): Promise<void> {
    if (!input.recipientUserId || input.recipientUserId === input.actorUserId) {
      return;
    }

    const snippet =
      input.content && input.content.length > 160
        ? `${input.content.slice(0, 157)}...`
        : input.content;

    await this.publish({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId,
      type: NotificationType.DIRECT_MESSAGE,
      entityType: NotificationEntityType.DIRECT_MESSAGE_CHANNEL,
      entityId: input.channelId,
      payload: {
        channelId: input.channelId,
        messageId: input.messageId,
        ...(snippet ? { content: snippet } : {}),
      },
      expiresInSeconds: 60 * 60 * 24 * 30,
    });
  }

  private async publish(
    event: Omit<DomainNotificationEvent, 'eventId'>,
  ): Promise<void> {
    try {
      await this.pubSub.publish<DomainNotificationEvent>(DOMAIN_EVENT_CHANNEL, {
        eventId: randomUUID(),
        ...event,
      });
    } catch (error) {
      this.logger.error('Failed to publish DM notification event.', error);
    }
  }
}