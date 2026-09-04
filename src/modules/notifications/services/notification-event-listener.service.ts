import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { NotificationCommandService } from './notification-command.service';
import { DomainNotificationEvent } from '../types/notification.types';
import { DOMAIN_EVENT_CHANNEL } from '../constants/notification.constants';

@Injectable()
export class NotificationEventListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationEventListenerService.name);

  private unsubscribe?: () => void;

  constructor(
    private readonly pubSub: RedisPubSubService,
    private readonly commandService: NotificationCommandService,
  ) {}

  async onModuleInit() {
    this.unsubscribe = await this.pubSub.subscribe<DomainNotificationEvent>(
      DOMAIN_EVENT_CHANNEL,
      (event) => {
        void this.handleDomainEvent(event);
      },
    );
  }

  onModuleDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private async handleDomainEvent(
    event: DomainNotificationEvent,
  ): Promise<void> {
    try {
      await this.commandService.create({
        recipientUserId: event.recipientUserId,
        actorUserId: event.actorUserId ?? null,
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        payload: event.payload,
        expiresAt: event.expiresInSeconds
          ? new Date(Date.now() + event.expiresInSeconds * 1000)
          : undefined,
        dedupeKey: `event:${event.eventId}`,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create notification from domain event.',
        error,
      );
    }
  }
}
