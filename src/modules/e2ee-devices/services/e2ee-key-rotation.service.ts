import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeDeviceRepository } from '../repositories/e2ee-device.repository';
import { E2eeSignedPreKeyRepository } from '../repositories/e2ee-signed-prekey.repository';
import { E2eeOneTimePreKeyRepository } from '../repositories/e2ee-one-time-prekey.repository';

@Injectable()
export class E2eeKeyRotationService {
  static readonly SIGNED_PREKEY_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  static readonly ONETIME_PREKEY_THRESHOLD = 20;
  static readonly ONETIME_PREKEY_BATCH_SIZE = 50;

  constructor(
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly signedPreKeyRepo: E2eeSignedPreKeyRepository,
    private readonly oneTimePreKeyRepo: E2eeOneTimePreKeyRepository,
    private readonly prisma: PrismaService,
  ) {}

  async rotateSignedPreKeyForDevice(deviceId: string) {
    const device = await this.deviceRepo.findActiveById(deviceId);
    if (!device) {
      throw new BadRequestException('Device not found or revoked');
    }

    const activePreKey = await this.signedPreKeyRepo.findActive(deviceId);
    if (!activePreKey) {
      throw new BadRequestException('No active signed prekey to rotate');
    }

    const lastRotation = activePreKey.rotatedAt ?? activePreKey.createdAt;
    const now = new Date();
    if (now.getTime() - lastRotation.getTime() < E2eeKeyRotationService.SIGNED_PREKEY_ROTATION_INTERVAL_MS) {
      return { rotated: false, reason: 'Too early for rotation' };
    }

    // In a real implementation, the client would generate the new signed prekey
    // and send it via the rotate-signed-prekey endpoint
    // This service just marks the old one as rotated and creates a placeholder
    // The actual new key comes from the client

    await this.signedPreKeyRepo.rotate(deviceId, {
      signedPreKeyId: activePreKey.signedPreKeyId + 1,
      publicKey: 'PENDING_CLIENT_ROTATION',
      signature: 'PENDING_CLIENT_ROTATION',
    });

    return { rotated: true };
  }

  async refillOneTimePreKeysForDevice(deviceId: string) {
    const device = await this.deviceRepo.findActiveById(deviceId);
    if (!device) {
      throw new BadRequestException('Device not found or revoked');
    }

    const available = await this.oneTimePreKeyRepo.countUnconsumed(deviceId);

    if (available >= E2eeKeyRotationService.ONETIME_PREKEY_THRESHOLD) {
      return { refilled: false, available, reason: 'Sufficient prekeys available' };
    }

    const toGenerate = E2eeKeyRotationService.ONETIME_PREKEY_BATCH_SIZE - available;

    // In a real implementation, the client would generate the new prekeys
    // and send them via the refill-one-time-prekeys endpoint
    // This service just tracks that a refill is needed

    return {
      refilled: false,
      available,
      needed: toGenerate,
      reason: 'Client must generate and submit new prekeys',
    };
  }

  async notifyClientOfNeededRotation(deviceId: string): Promise<{
    needsSignedPreKeyRotation: boolean;
    needsOneTimePreKeyRefill: boolean;
    availableOneTimePreKeys: number;
  }> {
    const device = await this.deviceRepo.findActiveById(deviceId);
    if (!device) {
      throw new BadRequestException('Device not found or revoked');
    }

    const activePreKey = await this.signedPreKeyRepo.findActive(deviceId);
    const available = await this.oneTimePreKeyRepo.countUnconsumed(deviceId);

    let needsSignedPreKeyRotation = false;
    if (activePreKey) {
      const lastRotation = activePreKey.rotatedAt ?? activePreKey.createdAt;
      const now = new Date();
      needsSignedPreKeyRotation =
        now.getTime() - lastRotation.getTime() >=
        E2eeKeyRotationService.SIGNED_PREKEY_ROTATION_INTERVAL_MS;
    }

    const needsOneTimePreKeyRefill =
      available < E2eeKeyRotationService.ONETIME_PREKEY_THRESHOLD;

    return {
      needsSignedPreKeyRotation,
      needsOneTimePreKeyRefill,
      availableOneTimePreKeys: available,
    };
  }
}