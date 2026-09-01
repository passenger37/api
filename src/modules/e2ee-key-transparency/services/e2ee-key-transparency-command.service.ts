import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeKeyTransparencyRepository } from '../repositories/e2ee-key-transparency.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { CreateKeyTransparencyEntryRequest, VerifyKeyTransparencyRequest } from '../dto/key-transparency.request';
import { serializeKeyTransparency, serializeKeyTransparencyList } from '../serializers/e2ee-key-transparency.serializer';

@Injectable()
export class E2eeKeyTransparencyCommandService {
  constructor(
    private readonly ktRepo: E2eeKeyTransparencyRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createEntry(userId: string, dto: CreateKeyTransparencyEntryRequest) {
    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or revoked');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Not authorized to create key transparency entry for this device');
    }

    const latestEpoch = await this.ktRepo.getLatestEpoch(userId);
    const expectedEpoch = (latestEpoch ?? 0n) + 1n;
    if (dto.epoch !== Number(expectedEpoch)) {
      throw new BadRequestException(`Expected epoch ${expectedEpoch}, got ${dto.epoch}`);
    }

    const entry = await this.ktRepo.create({
      user: { connect: { id: userId } },
      device: { connect: { id: dto.deviceId } },
      commitment: dto.commitment,
      epoch: expectedEpoch,
    });

    return { success: true, entry: serializeKeyTransparency(entry) };
  }

  async verifyEntry(userId: string, dto: VerifyKeyTransparencyRequest) {
    const entry = await this.ktRepo.findById(dto.entryId);
    if (!entry) {
      throw new NotFoundException('Key transparency entry not found');
    }
    if (entry.userId !== userId) {
      throw new ForbiddenException('Not authorized to verify this entry');
    }

    const updated = await this.ktRepo.markVerified(dto.entryId);
    return { success: true, entry: serializeKeyTransparency(updated) };
  }
}