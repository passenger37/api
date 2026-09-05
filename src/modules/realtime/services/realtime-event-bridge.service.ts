import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { REALTIME_EVENT_CHANNEL } from '../constants/realtime.constants';
import { RealtimeEventPayload } from '../types/realtime.types';

export type RealtimeEventHandler = (payload: RealtimeEventPayload) => void;

@Injectable()
export class RealtimeEventBridgeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeEventBridgeService.name);

  private unsubscribe?: () => void;

  private readonly handlers = new Set<RealtimeEventHandler>();

  constructor(private readonly pubSub: RedisPubSubService) {}

  async onModuleInit() {
    this.unsubscribe = await this.pubSub.subscribe<RealtimeEventPayload>(
      REALTIME_EVENT_CHANNEL,
      (event) => {
        void this.dispatch(event);
      },
    );
  }

  onModuleDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  registerHandler(handler: RealtimeEventHandler): void {
    this.handlers.add(handler);
  }

  unregisterHandler(handler: RealtimeEventHandler): void {
    this.handlers.delete(handler);
  }

  publish(payload: RealtimeEventPayload): Promise<void> {
    return this.publishRaw(payload);
  }

  private async publishRaw(payload: RealtimeEventPayload): Promise<void> {
    try {
      await this.pubSub.publish<RealtimeEventPayload>(
        REALTIME_EVENT_CHANNEL,
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to publish realtime event.', error);
    }
  }

  private dispatch(event: RealtimeEventPayload): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Failed to dispatch realtime event.', error);
      }
    }
  }
}
