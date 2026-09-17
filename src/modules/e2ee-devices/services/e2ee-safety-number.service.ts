import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeDeviceRepository } from '../repositories/e2ee-device.repository';
import { VerifySafetyNumberRequest } from '../dto/request/safety-number.request';
import { PublicKey, Fingerprint } from '../../../core/crypto/libsignal-shim';

@Injectable()
export class E2eeSafetyNumberService {
  constructor(
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async verifySafetyNumber(
    userId: string,
    dto: VerifySafetyNumberRequest,
  ) {
    const localDevice = await this.deviceRepo.findActiveById(
      dto.localDeviceId,
    );
    if (!localDevice || localDevice.userId !== userId) {
      throw new NotFoundException('Local device not found');
    }

    const remoteDevice = await this.deviceRepo.findActiveById(
      dto.remoteDeviceId,
    );
    if (!remoteDevice) {
      throw new NotFoundException('Remote device not found');
    }

    const localIdentifier = new TextEncoder().encode(localDevice.id);
    const remoteIdentifier = new TextEncoder().encode(remoteDevice.id);
    const localKey = PublicKey.deserialize(
      Buffer.from(localDevice.identityKeyPublic, 'base64'),
    );
    const remoteKey = PublicKey.deserialize(
      Buffer.from(dto.remoteIdentityKey, 'base64'),
    );

    const fingerprint = Fingerprint.new(
      dto.iterations,
      1, // version
      localIdentifier,
      localKey.serialize(),
      remoteIdentifier,
      remoteKey.serialize(),
    );

    const scannable = await fingerprint.scannableFingerprint();
    const displayable = await fingerprint.displayableFingerprint();

    // Store verification status
    await this.prisma.e2eeDeviceVerification.upsert({
      where: {
        localDeviceId_remoteDeviceId: {
          localDeviceId: dto.localDeviceId,
          remoteDeviceId: dto.remoteDeviceId,
        },
      },
      create: {
        localDeviceId: dto.localDeviceId,
        remoteDeviceId: dto.remoteDeviceId,
        verifiedAt: new Date(),
      },
      update: {
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      verified: true,
      scannableFingerprint: Buffer.from(scannable).toString('base64'),
      displayableFingerprint: displayable,
    };
  }

  async getVerificationStatus(
    localDeviceId: string,
    remoteDeviceId: string,
  ) {
    const verification =
      await this.prisma.e2eeDeviceVerification.findUnique({
        where: {
          localDeviceId_remoteDeviceId: {
            localDeviceId,
            remoteDeviceId,
          },
        },
      });

    return {
      success: true,
      verified: !!verification,
      verifiedAt: verification?.verifiedAt?.toISOString() ?? null,
    };
  }
}