import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import { WebSocketRateLimitService } from '../../../common/websocket/rate-limit/websocket-rate-limit.service';
import {
  ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
  ANONYMOUS_CHAT_WS_RATE_LIMIT,
  ANONYMOUS_CHAT_WINDOW_SECONDS,
} from '../constants/anonymous-chat.constants';
import {
  anonymousMessageRateLimited,
  anonymousQueueRateLimited,
  anonymousReportRateLimited,
  anonymousBlockRateLimited,
} from '../exceptions/anonymous-chat.exception';

/**
 * Typed rate limiting for the anonymous surface. Thin wrapper over the shared
 * `WebSocketRateLimitService` — no second Redis connection or rate-limit
 * architecture is introduced.
 */
@Injectable()
export class AnonymousChatRateLimitService {
  constructor(
    private readonly rateLimit: WebSocketRateLimitService,
    private readonly redis: RedisService,
  ) {}

  async assertJoinAllowed(userId: string): Promise<void> {
    try {
      await this.rateLimit.consume({
        key: this.key('join-queue', userId),
        limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.JOIN_QUEUE,
        windowSeconds: ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
      });
    } catch {
      throw anonymousQueueRateLimited();
    }
  }

  async assertMessageAllowed(userId: string): Promise<void> {
    try {
      await this.rateLimit.consume({
        key: this.key('message', userId),
        limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.MESSAGE,
        windowSeconds: ANONYMOUS_CHAT_WINDOW_SECONDS,
      });
    } catch {
      throw anonymousMessageRateLimited();
    }
  }

  async assertTypingAllowed(userId: string): Promise<void> {
    await this.rateLimit.consume({
      key: this.key('typing', userId),
      limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.TYPING,
      windowSeconds: ANONYMOUS_CHAT_WINDOW_SECONDS,
    });
  }

  async assertSkipAllowed(userId: string): Promise<void> {
    await this.rateLimit.consume({
      key: this.key('skip', userId),
      limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.SKIP,
      windowSeconds: ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
    });
  }

  async assertEndAllowed(userId: string): Promise<void> {
    await this.rateLimit.consume({
      key: this.key('end', userId),
      limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.END,
      windowSeconds: ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
    });
  }

  async assertReportAllowed(userId: string): Promise<void> {
    try {
      await this.rateLimit.consume({
        key: this.key('report', userId),
        limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.REPORT,
        windowSeconds: ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
      });
    } catch {
      throw anonymousReportRateLimited();
    }
  }

  async assertBlockAllowed(userId: string): Promise<void> {
    try {
      await this.rateLimit.consume({
        key: this.key('block', userId),
        limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.BLOCK,
        windowSeconds: ANONYMOUS_CHAT_TAU_WINDOW_SECONDS,
      });
    } catch {
      throw anonymousBlockRateLimited();
    }
  }

  async assertHeartbeatAllowed(userId: string): Promise<void> {
    await this.rateLimit.consume({
      key: this.key('heartbeat', userId),
      limit: ANONYMOUS_CHAT_WS_RATE_LIMIT.HEARTBEAT,
      windowSeconds: 60,
    });
  }

  private key(operation: string, userId: string): string {
    return `anonymous:${operation}:${userId}`;
  }

  /** Exposed for tests / observability. */
  getRedis(): RedisService {
    return this.redis;
  }
}
