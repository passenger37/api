import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class DisappearingMessageCleanupService {
  private readonly logger = new Logger(DisappearingMessageCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredMessages() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

    const channels = await this.prisma.directMessageChannel.findMany({
      where: {
        disappearingTtlSeconds: { not: null, gt: 0 },
        lastMessageAt: { not: null, gte: cutoff },
      },
      select: {
        id: true,
        disappearingTtlSeconds: true,
        lastMessageAt: true,
      },
    });

    let totalDeleted = 0;

    for (const channel of channels) {
      if (!channel.lastMessageAt || !channel.disappearingTtlSeconds) continue;

      const ttlMs = channel.disappearingTtlSeconds * 1000;
      const expiresAt = new Date(channel.lastMessageAt.getTime() + ttlMs);

      if (expiresAt <= new Date()) {
        const messagesToDelete = await this.prisma.directMessage.findMany({
          where: {
            channelId: channel.id,
            isDeleted: false,
            createdAt: { lt: expiresAt },
          },
          select: { id: true },
        });

        if (messagesToDelete.length > 0) {
          const messageIds = messagesToDelete.map((m) => m.id);

          await this.prisma.directMessage.updateMany({
            where: { id: { in: messageIds } },
            data: { isDeleted: true, deletedAt: new Date() },
          });

          await this.prisma.e2eeEnvelope.updateMany({
            where: {
              channelId: channel.id,
              createdAt: { lt: expiresAt },
              status: { not: 'EXPIRED' },
            },
            data: { status: 'EXPIRED' },
          });

          totalDeleted += messageIds.length;
        }
      }
    }

    if (totalDeleted > 0) {
      this.logger.log(
        `Cleaned up ${totalDeleted} expired disappearing messages`,
      );
    }
  }
}
