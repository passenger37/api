import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeRevocationRepository } from '../repositories/e2ee-revocation.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { GetRevocationsRequest } from '../dto/revocation.request';
import { serializeRevocation, serializeRevocationList } from '../serializers/e2ee-revocation.serializer';

@Injectable()
export class E2eeRevocationQueryService {
  constructor(
    private readonly revocationRepo: E2eeRevocationRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getRevocations(userId: string, dto: GetRevocationsRequest) {
    let revocations: any[];

    if (dto.deviceId) {
      const device = await this.deviceRepo.findById(dto.deviceId);
      if (!device || device.userId !== userId) {
        throw new NotFoundException('Device not found');
      }
      revocations = await this.revocationRepo.findByDevice(dto.deviceId);
    } else if (dto.initiatedByUserId) {
      if (dto.initiatedByUserId !== userId) {
        throw new ForbiddenException('Not authorized');
      }
      revocations = await this.revocationRepo.findByInitiator(dto.initiatedByUserId);
    } else {
      // Get all revocations for user's devices
      const devices = await this.prisma.e2eeDevice.findMany({
        where: { userId },
        select: { id: true },
      });
      const deviceIds = devices.map(d => d.id);
      revocations = [];
      for (const deviceId of deviceIds) {
        const revs = await this.revocationRepo.findByDevice(deviceId);
        revocations.push(...revs);
      }
    }

    return { success: true, revocations: serializeRevocationList(revocations) };
  }

  async getRevocationById(userId: string, revocationId: string) {
    const revocation = await this.revocationRepo.findById(revocationId);
    if (!revocation) {
      throw new NotFoundException('Revocation not found');
    }

    const device = await this.deviceRepo.findById(revocation.deviceId);
    if (!device || device.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return { success: true, revocation: serializeRevocation(revocation) };
  }
}