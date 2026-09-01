import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeRevocationRepository } from '../repositories/e2ee-revocation.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { serializeRevocation, serializeRevocationList } from '../serializers/e2ee-revocation.serializer';
import { RevokeDeviceRequest, AcknowledgeRevocationRequest } from '../dto/revocation.request';
import { E2eeRevocationReason } from '@prisma/client';

@Injectable()
export class E2eeRevocationCommandService {
  constructor(
    private readonly revocationRepo: E2eeRevocationRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async revokeDevice(userId: string, dto: RevokeDeviceRequest): Promise<{ success: boolean; revocation: any }> {
    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or already revoked');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Not authorized to revoke this device');
    }

    // Mark device as revoked
    await this.deviceRepo.markRevoked(device.id);

    // Create revocation record
    const revocation = await this.revocationRepo.create({
      device: { connect: { id: dto.deviceId } },
      reason: dto.reason,
      initiator: { connect: { id: userId } },
    });

    // Archive all sessions for this device
    await this.prisma.e2eeSession.updateMany({
      where: {
        OR: [
          { senderDeviceId: dto.deviceId },
          { recipientDeviceId: dto.deviceId },
        ],
        isActive: true,
      },
      data: { isActive: false, archivedAt: new Date() },
    });

    // Mark pending envelopes as expired
    await this.prisma.e2eeDeliveryQueue.updateMany({
      where: {
        targetDeviceId: dto.deviceId,
        status: 'PENDING',
      },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });

    await this.prisma.e2eeGroupDeliveryQueue.updateMany({
      where: {
        targetDeviceId: dto.deviceId,
        status: 'PENDING',
      },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });

    return { success: true, revocation: serializeRevocation(revocation) };
  }

  async acknowledgeRevocation(userId: string, dto: AcknowledgeRevocationRequest): Promise<{ success: boolean; revocation: any }> {
    const revocation = await this.revocationRepo.findById(dto.revocationId);
    if (!revocation) {
      throw new NotFoundException('Revocation not found');
    }

    const device = await this.prisma.e2eeDevice.findUnique({
      where: { id: revocation.deviceId },
    });
    if (!device || device.userId !== userId) {
      throw new ForbiddenException('Not authorized to acknowledge this revocation');
    }

    const updated = await this.revocationRepo.updateAcknowledged(dto.revocationId);
    return { success: true, revocation: serializeRevocation(updated) };
  }

  async requestReplacement(userId: string, revokedDeviceId: string, replacementDeviceId: string): Promise<{ success: boolean; revocation: any }> {
    const revocation = await this.prisma.e2eeDeviceRevocation.findFirst({
      where: { deviceId: revokedDeviceId },
      orderBy: { revokedAt: 'desc' },
    });
    if (!revocation) {
      throw new NotFoundException('Revocation not found');
    }

    const device = await this.prisma.e2eeDevice.findUnique({
      where: { id: revokedDeviceId },
    });
    if (!device || device.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const replacementDevice = await this.prisma.e2eeDevice.findUnique({
      where: { id: replacementDeviceId },
    });
    if (!replacementDevice || replacementDevice.userId !== userId) {
      throw new BadRequestException('Invalid replacement device');
    }

    const updated = await this.prisma.e2eeDeviceRevocation.update({
      where: { id: revocation.id },
      data: { replacementDeviceId },
    });

    return { success: true, revocation: serializeRevocation(updated) };
  }
}