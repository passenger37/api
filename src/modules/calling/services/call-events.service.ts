import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { CallStatus } from '@prisma/client';
import { CALL_EVENT_CHANNEL, CallLifecycleAction } from '../constants/calling.constants';

export interface CallLifecycleEvent {
  eventId: string;
  action: CallLifecycleAction;
  callId: string;
  scope: string;
  scopeRef: string;
  callType: string;
  status: CallStatus;
  actorUserId?: string;
  timestamp: number;
}

export interface CallLike {
  id: string;
  scope: string;
  scopeRef: string;
  type: string;
  status: CallStatus;
}

/**
 * Publishes call lifecycle events to the cluster-wide `calling:events`
 * Redis bus. Consumed by `CallingEventListenerService` for observability
 * (and later metrics / moderation hooks).
 */
@Injectable()
export class CallEventsService {
  private readonly logger = new Logger(CallEventsService.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publish(
    action: CallLifecycleAction,
    call: CallLike,
    actorUserId?: string,
  ): Promise<void> {
    const event: CallLifecycleEvent = {
      eventId: randomUUID(),
      action,
      callId: call.id,
      scope: call.scope,
      scopeRef: call.scopeRef,
      callType: call.type,
      status: call.status,
      actorUserId,
      timestamp: Date.now(),
    };

    try {
      await this.pubSub.publish<CallLifecycleEvent>(CALL_EVENT_CHANNEL, event);
    } catch (error) {
      this.logger.error('Failed to publish call lifecycle event.', error);
    }
  }
}