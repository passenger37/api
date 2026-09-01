import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeBackupRepository } from './repositories/e2ee-backup.repository';
import { E2eeBackupCommandService } from './services/e2ee-backup-command.service';
import { E2eeBackupQueryService } from './services/e2ee-backup-query.service';
import { E2eeBackupController } from './controllers/e2ee-backup.controller';

@Module({
  imports: [PrismaModule, E2eeDevicesModule],
  controllers: [E2eeBackupController],
  providers: [
    E2eeBackupRepository,
    E2eeBackupCommandService,
    E2eeBackupQueryService,
  ],
  exports: [E2eeBackupCommandService, E2eeBackupQueryService],
})
export class E2eeBackupModule {}