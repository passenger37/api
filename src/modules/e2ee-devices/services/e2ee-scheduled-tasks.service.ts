import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeDeviceRepository } from '../repositories/e2ee-device.repository';
import { E2eeSignedPreKeyRepository } from '../repositories/e2ee-signed-prekey.repository';
import { E2eeOneTimePreKeyRepository } from '../repositories/e2ee-one-time-prekey.repository';
import { E2eeKeyRotationService } from './e2ee-key-rotation.service';

@Injectable()
export class E2eeScheduledTasksService {
  private readonly logger = new Logger(E2eeScheduledTasksService.name);

  constructor(
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly signedPreKeyRepo: E2eeSignedPreKeyRepository,
    private readonly oneTimePreKeyRepo: E2eeOneTimePreKeyRepository,
    private readonly keyRotationService: E2eeKeyRotationService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async rotateSignedPreKeys() {
    this.logger.log('Starting daily signed prekey rotation');

    const devices = await this.prisma.e2eeDevice.findMany({
      where: {
        isRevoked: false,
        signedPreKeys: {
          some: {
            isActive: true,
            rotatedAt: {
              lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
        },
      },
      select: { id: true, userId: true },
    });

    for (const device of devices) {
      try {
        await this.keyRotationService.rotateSignedPreKeyForDevice(device.id);
        this.logger.log(`Rotated signed prekey for device ${device.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to rotate signed prekey for device ${device.id}`,
          error,
        );
      }
    }

    this.logger.log(`Completed rotation for ${devices.length} devices`);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async refillOneTimePreKeys() {
    this.logger.log('Starting one-time prekey refill check');

    const devices = await this.prisma.e2eeDevice.findMany({
      where: {
        isRevoked: false,
        oneTimePreKeys: {
          some: { isConsumed: false },
        },
      },
      select: { id: true, userId: true },
    });

    for (const device of devices) {
      const available = await this.oneTimePreKeyRepo.countUnconsumed(device.id);

      if (available < 20) {
        try {
          await this.keyRotationService.refillOneTimePreKeysForDevice(
            device.id,
          );
          this.logger.log(`Refilled one-time prekeys for device ${device.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to refill one-time prekeys for device ${device.id}`,
            error,
          );
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupDeliveredEnvelopes() {
    this.logger.log('Cleaning up old delivered envelopes');

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const count = await this.prisma.e2eeEnvelope.deleteMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lt: cutoff },
      },
    });

    this.logger.log(`Deleted ${count.count} old delivered envelopes`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveStaleSessions() {
    this.logger.log('Archiving stale sessions');

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
    const count = await this.prisma.e2eeSession.updateMany({
      where: {
        isActive: true,
        updatedAt: { lt: cutoff },
      },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    this.logger.log(`Archived ${count.count} stale sessions`);
  }
}
