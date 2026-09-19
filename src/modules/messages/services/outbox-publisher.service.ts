import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  OutboxEventRepository,
  OUTBOX_TRACE_KEY,
} from '../repositories/outbox-event.repository';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { TraceService } from '../../../core/tracing/trace.service';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);

  private readonly intervalMs = 500;

  private timer?: NodeJS.Timeout;

  private publishing = false;

  constructor(
    private readonly outboxRepository: OutboxEventRepository,
    private readonly gateway: ChannelMessageGateway,
    private readonly traceService: TraceService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async poll() {
    if (this.publishing) {
      return;
    }

    this.publishing = true;

    try {
      const events = await this.outboxRepository.findPendingBatch();

      for (const event of events) {
        try {
          const payload = (event.payload as Record<string, unknown>) ?? {};
          const traceBlob = payload[OUTBOX_TRACE_KEY];
          const traceId =
            (traceBlob as { traceId?: string } | undefined)?.traceId ?? '';

          // Restore the originating trace context for downstream delivery.
          await this.traceService.run({ traceId }, async () => {
            await this.publish(event);
          });

          await this.outboxRepository.markProcessed([event.id]);
        } catch (error) {
          await this.outboxRepository.recordFailure(
            event.id,
            error instanceof Error ? error.message : String(error),
            event.attempts + 1,
          );
        }
      }
    } catch (error) {
      this.logger.error('Outbox polling failed.', error);
    } finally {
      this.publishing = false;
    }
  }

  private publish(event: {
    eventType: string;
    channelId: string | null;
    payload: unknown;
  }) {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    // Strip the internal trace marker before broadcasting to clients.
    const { [OUTBOX_TRACE_KEY]: _trace, ...publicPayload } = payload;

    switch (event.eventType) {
      case 'message-created':
        this.gateway.broadcastMessageCreated(
          event.channelId as string,
          publicPayload,
        );
        return;

      case 'message-updated':
        this.gateway.broadcastMessageUpdated(
          event.channelId as string,
          publicPayload,
        );
        return;

      default:
        throw new Error(`Unsupported outbox event type: ${event.eventType}`);
    }
  }
}
