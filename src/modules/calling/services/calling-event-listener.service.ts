import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { CALL_EVENT_CHANNEL } from '../constants/calling.constants';
import { CallLifecycleEvent } from './call-events.service';

/**
 * Consumes `calling:events` (Redis pub/sub) for observability: structured
 * logging of the cluster-wide call lifecycle. Future hooks: metrics counters,
 * moderation surfaces, missed-call analytics.
 */
@Injectable()
export class CallingEventListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CallingEventListenerService.name);

  private unsubscribe?: () => void;

  constructor(private readonly pubSub: RedisPubSubService) {}

  async onModuleInit() {
    this.unsubscribe = await this.pubSub.subscribe<CallLifecycleEvent>(
      CALL_EVENT_CHANNEL,
      (event) => {
        this.handleLifecycleEvent(event);
      },
    );
  }

  onModuleDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private handleLifecycleEvent(event: CallLifecycleEvent): void {
    this.logger.log(
      `[calling] ${event.action} call=${event.callId} scope=${event.scope}:${event.scopeRef} type=${event.callType} status=${event.status} actor=${event.actorUserId ?? '-'}`,
    );
  }
}
