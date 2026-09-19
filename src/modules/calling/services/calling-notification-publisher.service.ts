import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { DOMAIN_EVENT_CHANNEL } from '../../notifications/constants/notification.constants';
import { DomainNotificationEvent } from '../../notifications/types/notification.types';
import { CallType, CallScope } from '../types/calling.types';

/**
 * Publishes call lifecycle domain events to the notifications bus
 * (`notifications:domain-events`). Calling never writes to the notification
 * store directly; NotificationEventListenerService consumes these events.
 */
@Injectable()
export class CallingNotificationPublisher {
  private readonly logger = new Logger(CallingNotificationPublisher.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  /** The rung peer did not answer / explicitly rejected. */
  async publishMissedCall(input: {
    recipientUserId: string;
    initiatorUserId: string;
    callId: string;
    scope: CallScope | string;
    callType: CallType | string;
    scopeRef: string;
  }): Promise<void> {
    await this.publishDomainEvent({
      eventId: randomUUID(),
      recipientUserId: input.recipientUserId,
      actorUserId: input.initiatorUserId,
      type: 'MISSED_CALL',
      entityType: this.entityTypeForScope(input.scope),
      entityId: input.scopeRef,
      payload: {
        callId: input.callId,
        scope: input.scope,
        callType: input.callType,
        initiatorUserId: input.initiatorUserId,
      },
      expiresInSeconds: 60 * 60 * 24 * 7,
    });
  }

  /** A DM call request is being rung on the target. */
  async publishIncomingCall(input: {
    recipientUserId: string;
    initiatorUserId: string;
    callId: string;
    scope: CallScope | string;
    callType: CallType | string;
    scopeRef: string;
  }): Promise<void> {
    await this.publishDomainEvent({
      eventId: randomUUID(),
      recipientUserId: input.recipientUserId,
      actorUserId: input.initiatorUserId,
      type: 'CALL_INCOMING',
      entityType: this.entityTypeForScope(input.scope),
      entityId: input.scopeRef,
      payload: {
        callId: input.callId,
        scope: input.scope,
        callType: input.callType,
        initiatorUserId: input.initiatorUserId,
      },
      expiresInSeconds: 10 * 60,
    });
  }

  private entityTypeForScope(
    scope: CallScope | string,
  ): 'DIRECT_MESSAGE_CHANNEL' | 'CHANNEL' {
    return scope === CallScope.DM || scope === 'DM'
      ? 'DIRECT_MESSAGE_CHANNEL'
      : 'CHANNEL';
  }

  private async publishDomainEvent(
    event: DomainNotificationEvent,
  ): Promise<void> {
    try {
      await this.pubSub.publish<DomainNotificationEvent>(
        DOMAIN_EVENT_CHANNEL,
        event,
      );
    } catch (error) {
      this.logger.error('Failed to publish call notification event.', error);
    }
  }
}
