import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import {
  COMMUNITY_REALTIME_EVENTS,
  CommunityRealtimeEventName,
  communityEventChannel,
} from '../realtime/community-realtime.constants';

/**
 * Envelope published on the per-community Redis channel. The `event` field
 * matches one of COMMUNITY_REALTIME_EVENTS; the `payload` is event-specific
 * (kept loose on purpose — the gateway layer is responsible for
 * authentication/authorization and for translating into the per-user
 * delivery surface).
 */
export interface CommunityRealtimeEnvelope {
  event: CommunityRealtimeEventName;
  communityId: string;
  /** ISO timestamp at which the publisher produced the event. */
  emittedAt: string;
  /** Caller-provided opaque data, JSON-serializable. */
  payload: Record<string, unknown>;
}

/**
 * Lecture 51.12 — publish-only side of community realtime.
 *
 * The publisher is deliberately decoupled from any Socket.IO gateway so the
 * command/query services don't take a transport dependency. A future gateway
 * module subscribes to `communityEventChannel(communityId)` and fans out to
 * the right socket rooms.
 */
@Injectable()
export class CommunityEventPublisher {
  private readonly logger = new Logger(CommunityEventPublisher.name);

  constructor(private readonly redis: RedisService) {}

  async publish(
    communityId: string,
    event: CommunityRealtimeEventName,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const envelope: CommunityRealtimeEnvelope = {
      event,
      communityId,
      emittedAt: new Date().toISOString(),
      payload,
    };

    // Serialize the envelope up front, separately from the Redis call, so
    // a non-serializable payload is reported as a payload error rather
    // than being conflated with a transport failure.
    let serialized: string;
    try {
      serialized = JSON.stringify(envelope);
    } catch (err) {
      this.logger.error(
        `Failed to serialize community realtime event communityId=${communityId} event=${event}`,
        err instanceof Error ? err.stack : String(err),
      );
      return;
    }

    const channel = communityEventChannel(communityId);

    try {
      // `waitUntilReady` is required because RedisService is configured with
      // `disableOfflineQueue: true` (see redis.service.ts): commands issued
      // before the connection is ready are rejected instead of queued. A
      // services-module onModuleInit hook can run concurrently with the
      // RedisService hook under Nest's parallel init, so the first publish
      // in a freshly booted process is racy without this barrier.
      await this.redis.waitUntilReady();
      const client = this.redis.getClient();
      await client.publish(channel, serialized);
    } catch (err) {
      // Publishing realtime events must not break the originating HTTP
      // request. We log and move on — the database write is the source of
      // truth; a missed realtime event is recoverable via the next read.
      this.logger.error(
        `Failed to publish community realtime event communityId=${communityId} event=${event} channel=${channel}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
