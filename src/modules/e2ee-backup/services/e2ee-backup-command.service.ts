import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeBackupRepository } from '../repositories/e2ee-backup.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { serializeBackup, serializeBackupList } from '../serializers/e2ee-backup.serializer';
import { CreateBackupRequest } from '../dto/backup.request';
import * as crypto from 'crypto';

@Injectable()
export class E2eeBackupCommandService {
  constructor(
    private readonly backupRepo: E2eeBackupRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createBackup(userId: string, dto: CreateBackupRequest) {
    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or revoked');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Not authorized to create backup for this device');
    }

    // Hash recovery password if provided
    let recoveryPasswordHash: string | undefined;
    if (dto.recoveryPasswordHash) {
      // In production, use Argon2id with proper salt
      recoveryPasswordHash = crypto
        .createHash('sha256')
        .update(dto.recoveryPasswordHash)
        .digest('hex');
    }

    const backup = await this.backupRepo.create({
      user: { connect: { id: userId } },
      device: { connect: { id: dto.deviceId } },
      payload: dto.payload,
      version: dto.version,
      recoveryPasswordHash,
      status: 'PENDING',
    });

    // Simulate async backup completion
    // In production, this would be an async job
    setImmediate(async () => {
      await this.backupRepo.updateStatus(backup.id, 'COMPLETED');
    });

    return { success: true, backup: serializeBackup(backup) };
  }

  async deleteBackup(userId: string, backupId: string) {
    const backup = await this.backupRepo.findById(backupId);
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    if (backup.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this backup');
    }

    await this.prisma.e2eeEncryptedBackup.delete({ where: { id: backupId } });
    return { success: true, deleted: true };
  }
}