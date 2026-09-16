import { Injectable, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';

@Injectable()
export class CallAbuseProtectionService {
  private readonly CALL_CREATE_LIMIT = 20;
  private readonly CALL_CREATE_WINDOW_MS = 60 * 60 * 1000;
  private readonly UNIQUE_RECIPIENT_LIMIT = 5;
  private readonly UNIQUE_RECIPIENT_WINDOW_MS = 60 * 60 * 1000;
  private readonly REJECTION_RATIO_THRESHOLD = 0.8;
  private readonly MIN_REJECTIONS_FOR_RATIO = 5;
  private readonly COOLDOWN_MS = 30 * 60 * 1000;

  constructor(private readonly redis: RedisService) {}

  private get client() {
    return this.redis.getClient();
  }

  async checkCreateCallAllowed(
    callerId: string,
    scope: string,
    scopeRef: string,
    targetUserIds: string[],
  ): Promise<void> {
    await this.checkCallFrequency(callerId);
    await this.checkUniqueRecipients(callerId, targetUserIds);
    await this.checkRejectionRatio(callerId);
    await this.checkCooldown(callerId);
  }

  async recordCallCreated(callerId: string, targetUserIds: string[]): Promise<void> {
    const now = Date.now();
    const pipeline = this.client.multi();
    pipeline.zAdd(`call:create:${callerId}`, { score: now, value: `${now}:${callerId}` });
    pipeline.expire(`call:create:${callerId}`, Math.ceil(this.CALL_CREATE_WINDOW_MS / 1000));
    for (const targetId of targetUserIds) {
      pipeline.zAdd(`call:recipient:${callerId}`, { score: now, value: targetId });
      pipeline.expire(`call:recipient:${callerId}`, Math.ceil(this.UNIQUE_RECIPIENT_WINDOW_MS / 1000));
    }
    await pipeline.exec();
  }

  async recordCallRejected(callerId: string): Promise<void> {
    const now = Date.now();
    await this.client.zAdd(`call:rejected:${callerId}`, { score: now, value: `${now}` });
    await this.client.expire(`call:rejected:${callerId}`, Math.ceil(this.CALL_CREATE_WINDOW_MS / 1000));
  }

  async recordCallAccepted(callerId: string): Promise<void> {
    const now = Date.now();
    await this.client.zAdd(`call:accepted:${callerId}`, { score: now, value: `${now}` });
    await this.client.expire(`call:accepted:${callerId}`, Math.ceil(this.CALL_CREATE_WINDOW_MS / 1000));
  }

  private async checkCallFrequency(userId: string): Promise<void> {
    const windowStart = Date.now() - this.CALL_CREATE_WINDOW_MS;
    const count = await this.client.zCount(`call:create:${userId}`, windowStart, '+inf');
    if (count >= this.CALL_CREATE_LIMIT) {
      throw new ForbiddenException(
        'CALL_RATE_LIMIT: too many call attempts. Please wait before trying again.',
      );
    }
  }

  private async checkUniqueRecipients(callerId: string, targetUserIds: string[]): Promise<void> {
    const windowStart = Date.now() - this.UNIQUE_RECIPIENT_WINDOW_MS;
    const recipients = await this.client.zRange(
      `call:recipient:${callerId}`,
      0,
      -1,
    );
    const recentRecipients = new Set<string>();
    for (const entry of recipients) {
      const [scoreStr, targetId] = entry.split(':');
      if (parseInt(scoreStr, 10) >= windowStart) {
        recentRecipients.add(targetId);
      }
    }
    for (const targetId of targetUserIds) {
      recentRecipients.add(targetId);
    }
    if (recentRecipients.size > this.UNIQUE_RECIPIENT_LIMIT) {
      throw new ForbiddenException(
        'CALL_RATE_LIMIT: too many unique recipients. Please wait before calling more people.',
      );
    }
  }

  private async checkRejectionRatio(userId: string): Promise<void> {
    const windowStart = Date.now() - this.CALL_CREATE_WINDOW_MS;
    const [rejected, accepted] = await Promise.all([
      this.client.zCount(`call:rejected:${userId}`, windowStart, '+inf'),
      this.client.zCount(`call:accepted:${userId}`, windowStart, '+inf'),
    ]);
    const total = rejected + accepted;
    if (total >= this.MIN_REJECTIONS_FOR_RATIO) {
      const ratio = rejected / total;
      if (ratio >= this.REJECTION_RATIO_THRESHOLD) {
        throw new ForbiddenException(
          'CALL_ABUSE_DETECTED: high rejection ratio. Calling temporarily restricted.',
        );
      }
    }
  }

  private async checkCooldown(userId: string): Promise<void> {
    const cooldownUntil = await this.client.get(`call:cooldown:${userId}`);
    if (cooldownUntil && parseInt(cooldownUntil, 10) > Date.now()) {
      throw new ForbiddenException(
        'CALL_COOLDOWN: you are temporarily restricted from making calls.',
      );
    }
  }

  async applyCooldown(userId: string): Promise<void> {
    const until = Date.now() + this.COOLDOWN_MS;
    await this.client.set(`call:cooldown:${userId}`, until.toString(), {
      EX: Math.ceil(this.COOLDOWN_MS / 1000),
    });
  }
}