import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../../core/database/prisma.module';

import { E2eeDeviceController } from './controllers/e2ee-device.controller';
import { E2eeDeviceRepository } from './repositories/e2ee-device.repository';
import { E2eeOneTimePreKeyRepository } from './repositories/e2ee-one-time-prekey.repository';
import { E2eeSignedPreKeyRepository } from './repositories/e2ee-signed-prekey.repository';
import { E2eeDeviceCommandService } from './services/e2ee-device-command.service';
import { E2eeDeviceQueryService } from './services/e2ee-device-query.service';
import { E2eeSafetyNumberService } from './services/e2ee-safety-number.service';
import { E2eeKeyRotationService } from './services/e2ee-key-rotation.service';
import { E2eeScheduledTasksService } from './services/e2ee-scheduled-tasks.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [E2eeDeviceController],
  providers: [
    E2eeDeviceRepository,
    E2eeSignedPreKeyRepository,
    E2eeOneTimePreKeyRepository,
    E2eeDeviceCommandService,
    E2eeDeviceQueryService,
    E2eeSafetyNumberService,
    E2eeKeyRotationService,
    E2eeScheduledTasksService,
  ],
  exports: [
    E2eeDeviceRepository,
    E2eeDeviceCommandService,
    E2eeDeviceQueryService,
    E2eeSafetyNumberService,
    E2eeKeyRotationService,
  ],
})
export class E2eeDevicesModule {}
