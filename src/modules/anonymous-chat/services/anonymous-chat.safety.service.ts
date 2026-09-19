import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';
import {
  ANONYMOUS_MAX_MESSAGE_LENGTH,
  ANONYMOUS_SKIP_COOLDOWN_SECONDS,
  ANONYMOUS_SKIP_LIMIT,
  ANONYMOUS_SKIP_WINDOW_SECONDS,
  ANONYMOUS_SPAM_LIMIT,
  ANONYMOUS_SPAM_WINDOW_SECONDS,
  anonymousRestrictionKey,
  anonymousSkipKey,
  anonymousSpamKey,
} from '../constants/anonymous-chat.constants';
import {
  anonymousMessageTooLarge,
  anonymousNotAllowed,
  anonymousSkipCooldown,
} from '../exceptions/anonymous-chat.exception';

const MAX_CONTROL_CHAR_RATIO = 0.1;

@Injectable()
export class AnonymousChatSafetyService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Message-level safety: size, control-char ratio and same-content spam.
   * Throws when the payload is not acceptable; otherwise returns a signature
   * the caller can use to record the send.
   */
  async assertSafeToSend(
    userId: string,
    roomId: string,
    content: string,
  ): Promise<string> {
    if (content.length > ANONYMOUS_MAX_MESSAGE_LENGTH) {
      throw anonymousMessageTooLarge();
    }

    const sanitized = content.replace(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      '',
    );
    const controlChars = content.length - sanitized.length;
    if (
      content.length > 0 &&
      controlChars / content.length > MAX_CONTROL_CHAR_RATIO
    ) {
      throw anonymousMessageTooLarge();
    }

    const signature = createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex')
      .slice(0, 24);

    const key = anonymousSpamKey(roomId, userId, signature);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, ANONYMOUS_SPAM_WINDOW_SECONDS);

    if (count > ANONYMOUS_SPAM_LIMIT) {
      throw anonymousNotAllowed();
    }

    return signature;
  }

  /**
   * Records a skip and returns the remaining allowance. When the user exceeds
   * `ANONYMOUS_SKIP_LIMIT` within the window they enter a cooldown and cannot
   * rejoin the queue until `retryAfterSeconds` elapses.
   */
  async recordSkip(
    userId: string,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const key = anonymousSkipKey(userId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, ANONYMOUS_SKIP_WINDOW_SECONDS);

    if (count > ANONYMOUS_SKIP_LIMIT) {
      await this.redis.set(
        anonymousRestrictionKey(userId),
        'skip-cooldown',
        ANONYMOUS_SKIP_COOLDOWN_SECONDS,
      );
      return {
        allowed: false,
        retryAfterSeconds: ANONYMOUS_SKIP_COOLDOWN_SECONDS,
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  async assertSkipAllowed(userId: string): Promise<void> {
    if (await this.isRestricted(userId)) {
      const ttl = await this.restrictionTtlSeconds(userId);
      throw anonymousSkipCooldown(
        ttl > 0 ? ttl : ANONYMOUS_SKIP_COOLDOWN_SECONDS,
      );
    }
  }

  async isRestricted(userId: string): Promise<boolean> {
    return this.redis.exists(anonymousRestrictionKey(userId));
  }

  async clearRestriction(userId: string): Promise<void> {
    await this.redis.del(anonymousRestrictionKey(userId));
  }

  async restrictionTtlSeconds(userId: string): Promise<number> {
    const ttl = await this.redis
      .getClient()
      .ttl(anonymousRestrictionKey(userId));
    return ttl > 0 ? ttl : 0;
  }
}
