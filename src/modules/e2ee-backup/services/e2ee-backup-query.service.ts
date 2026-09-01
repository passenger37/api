import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { E2eeBackupRepository } from '../repositories/e2ee-backup.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { GetBackupsRequest } from '../dto/backup.request';
import { serializeBackup, serializeBackupList } from '../serializers/e2ee-backup.serializer';

@Injectable()
export class E2eeBackupQueryService {
  constructor(
    private readonly backupRepo: E2eeBackupRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
  ) {}

  async getBackups(userId: string, dto: GetBackupsRequest) {
    let backups: any[];

    if (dto.deviceId) {
      const device = await this.deviceRepo.findById(dto.deviceId);
      if (!device || device.userId !== userId) {
        throw new NotFoundException('Device not found');
      }
      backups = await this.backupRepo.findByDevice(dto.deviceId);
    } else {
      backups = await this.backupRepo.findByUser(userId);
    }

    return { success: true, backups: serializeBackupList(backups) };
  }

  async getBackupById(userId: string, backupId: string) {
    const backup = await this.backupRepo.findById(backupId);
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    if (backup.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this backup');
    }
    return { success: true, backup: serializeBackup(backup) };
  }
}