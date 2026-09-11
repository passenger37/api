import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { CallStatus } from '@prisma/client';
import { CallRepository } from '../repositories/call.repository';
import { CallEventsService } from './call-events.service';
import { CallingNotificationPublisher } from './calling-notification-publisher.service';
import { CallStateMachine } from './call-state-machine';
import {
  CALL_CLEANUP_INTERVAL_SECONDS,
  CALL_RING_TTL_SECONDS,
} from '../constants/calling.constants';

export interface ExpiredCallResult {
  callId: string;
  scope: string;
  scopeRef: string;
  callType: string;
  creatorUserId: string;
  timedOut: boolean;
}

/**
 * Expires RINGING calls that were never answered within `CALL_RING_TTL_SECONDS`.
 * - DM calls become MISSED_CALL notifications for the initiator.
 * - The lifecycle bus carries an `EXPIRED` event; the gateway broadcasts
 *   `CALL_EVENT_END` to the call room so connected clients tear down.
 *
 * Runs on a node-local interval; cross-node room emissions are synchronized
 * by the Redis socket adapter, and expiry is idempotent (status-guarded update).
 */
@Injectable()
export class CallingCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallingCleanupService.name);

  private timer?: NodeJS.Timeout;

  constructor(
    private readonly callRepo: CallRepository,
    private readonly callEvents: CallEventsService,
    private readonly notificationPublisher: CallingNotificationPublisher,
  ) {}

  onModuleInit() {
    this.timer = setInterval(
      () => {
        void this.sweep().catch((error) => {
          this.logger.error('Calling cleanup sweep failed.', error);
        });
      },
      CALL_CLEANUP_INTERVAL_SECONDS * 1000,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async sweep(): Promise<ExpiredCallResult[]> {
    const before = new Date(Date.now() - CALL_RING_TTL_SECONDS * 1000);
    const stale = await this.callRepo.findStaleRingingCalls(before);

    const results: ExpiredCallResult[] = [];

    for (const call of stale) {
      try {
        CallStateMachine.assertReachable('RINGING', CallStatus.ENDED);

        const updated = await this.callRepo.update(call.id, {
          status: CallStatus.ENDED,
          endedAt: new Date(),
        });

        // DM scope: the rung peer never answered -> missed call for the initiator.
        if (call.scope === 'DM') {
          await this.notificationPublisher.publishMissedCall({
            recipientUserId: call.creatorUserId,
            initiatorUserId: call.creatorUserId,
            callId: call.id,
            scope: call.scope,
            callType: call.type,
            scopeRef: call.scopeRef,
          });
        }

        await this.callEvents.publish('EXPIRED', updated, call.creatorUserId);

        results.push({
          callId: updated.id,
          scope: updated.scope,
          scopeRef: updated.scopeRef,
          callType: updated.type,
          creatorUserId: updated.creatorUserId,
          timedOut: true,
        });
      } catch (error) {
        this.logger.warn(`Failed to expire stale call ${call.id}.`, error);
      }
    }

    if (results.length > 0) {
      this.logger.log(`Calling cleanup expired ${results.length} stale call(s).`);
    }

    return results;
  }
}