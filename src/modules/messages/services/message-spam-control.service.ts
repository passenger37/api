import { createHash } from 'crypto';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class MessageSpamControlService {
  static readonly SEND_RATE_LIMIT = 20;
  static readonly SEND_RATE_WINDOW_SECONDS = 10;

  static readonly DUPLICATE_WINDOW_SECONDS = 30;

  static readonly UPLOAD_RATE_LIMIT = 10;
  static readonly UPLOAD_RATE_WINDOW_SECONDS = 60;

  constructor(private readonly redis: RedisService) {}

  /**
   * Abuse control for message sends: a fixed-window rate limit per member
   * plus a duplicate-content detector so copy-paste spam is rejected.
   * Redis is only an accelerator here; PostgreSQL remains the source of
   * truth for durable messages.
   */
  async checkSend(channelId: string, memberId: string, content: string) {
    const rateKey = `spam:send:${memberId}`;

    const rate = await this.redis.incr(rateKey);

    if (rate === 1) {
      await this.redis.expire(
        rateKey,
        MessageSpamControlService.SEND_RATE_WINDOW_SECONDS,
      );
    }

    if (rate > MessageSpamControlService.SEND_RATE_LIMIT) {
      throw new HttpException(
        'Too many messages. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const signature = this.signature(content);

    const duplicateKey = `spam:sig:${channelId}:${memberId}:${signature}`;

    const duplicate = await this.redis.incr(duplicateKey);

    if (duplicate === 1) {
      await this.redis.expire(
        duplicateKey,
        MessageSpamControlService.DUPLICATE_WINDOW_SECONDS,
      );
    }

    if (duplicate > 1) {
      throw new HttpException(
        'Duplicate content detected. Please avoid spamming.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Abuse control for attachment upload requests: bounds how often one
   * member can request signed uploads in a short window.
   */
  async checkUploadRequest(memberId: string) {
    const key = `spam:upload:${memberId}`;

    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(
        key,
        MessageSpamControlService.UPLOAD_RATE_WINDOW_SECONDS,
      );
    }

    if (count > MessageSpamControlService.UPLOAD_RATE_LIMIT) {
      throw new HttpException(
        'Too many uploads. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private signature(content: string): string {
    return createHash('sha1')
      .update(content.trim().toLowerCase())
      .digest('hex')
      .slice(0, 24);
  }
}
