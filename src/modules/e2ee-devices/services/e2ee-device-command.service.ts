import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { E2eeDevice } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { RegisterDeviceRequest } from '../dto/request/register-device.request';
import { RefillOneTimePreKeysRequest } from '../dto/request/refill-one-time-prekeys.request';
import { RotateSignedPreKeyRequest } from '../dto/request/rotate-signed-prekey.request';
import { E2eeDeviceRepository } from '../repositories/e2ee-device.repository';
import { E2eeOneTimePreKeyRepository } from '../repositories/e2ee-one-time-prekey.repository';
import { E2eeSignedPreKeyRepository } from '../repositories/e2ee-signed-prekey.repository';

@Injectable()
export class E2eeDeviceCommandService {
  static readonly MAX_DEVICES_PER_USER = 10;
  static readonly MAX_PREKEY_BATCH = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly deviceRepository: E2eeDeviceRepository,
    private readonly signedPreKeyRepository: E2eeSignedPreKeyRepository,
    private readonly oneTimePreKeyRepository: E2eeOneTimePreKeyRepository,
  ) {}

  async register(userId: string, request: RegisterDeviceRequest) {
    if (
      request.oneTimePreKeys.length > E2eeDeviceCommandService.MAX_PREKEY_BATCH
    ) {
      throw new BadRequestException('One-time prekey batch is too large.');
    }

    return this.prisma.$transaction(async (tx) => {
      const deviceCount = await this.deviceRepository.countForUser(userId, tx);

      if (deviceCount >= E2eeDeviceCommandService.MAX_DEVICES_PER_USER) {
        throw new BadRequestException(
          `Device limit of ${E2eeDeviceCommandService.MAX_DEVICES_PER_USER} reached.`,
        );
      }

      const device = await this.deviceRepository.create(
        {
          userId,
          name: request.name,
          platform: request.platform,
          identityKeyPublic: request.identityKeyPublic,
        },
        tx,
      );

      await this.signedPreKeyRepository.createInitial(
        device.id,
        {
          signedPreKeyId: request.signedPreKey.signedPreKeyId,
          publicKey: request.signedPreKey.publicKey,
          signature: request.signedPreKey.signature,
        },
        tx,
      );

      await this.oneTimePreKeyRepository.addBatch(
        device.id,
        request.oneTimePreKeys,
        tx,
      );

      return device;
    });
  }

  async rotateSignedPreKey(
    userId: string,
    deviceId: string,
    request: RotateSignedPreKeyRequest,
  ) {
    const device = await this.requireOwnedDevice(userId, deviceId);

    return this.signedPreKeyRepository.rotate(device.id, {
      signedPreKeyId: request.signedPreKeyId,
      publicKey: request.publicKey,
      signature: request.signature,
    });
  }

  async refillOneTimePreKeys(
    userId: string,
    deviceId: string,
    request: RefillOneTimePreKeysRequest,
  ) {
    if (request.keys.length > E2eeDeviceCommandService.MAX_PREKEY_BATCH) {
      throw new BadRequestException('One-time prekey batch is too large.');
    }

    const device = await this.requireOwnedDevice(userId, deviceId);

    const added = await this.oneTimePreKeyRepository.addBatch(
      device.id,
      request.keys,
    );
    const available = await this.oneTimePreKeyRepository.countUnconsumed(
      device.id,
    );

    return {
      added,
      available,
    };
  }

  async revoke(userId: string, deviceId: string): Promise<void> {
    const device = await this.requireOwnedDevice(userId, deviceId);

    await this.deviceRepository.markRevoked(device.id);
  }

  private async requireOwnedDevice(
    userId: string,
    deviceId: string,
  ): Promise<E2eeDevice> {
    const device = await this.deviceRepository.findActiveById(deviceId);

    if (!device || device.userId !== userId) {
      throw new NotFoundException('Device not found.');
    }

    return device;
  }
}
