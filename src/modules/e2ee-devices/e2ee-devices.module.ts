import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { E2eeDeviceController } from './controllers/e2ee-device.controller';
import { E2eeDeviceRepository } from './repositories/e2ee-device.repository';
import { E2eeOneTimePreKeyRepository } from './repositories/e2ee-one-time-prekey.repository';
import { E2eeSignedPreKeyRepository } from './repositories/e2ee-signed-prekey.repository';
import { E2eeDeviceCommandService } from './services/e2ee-device-command.service';
import { E2eeDeviceQueryService } from './services/e2ee-device-query.service';

@Module({
  imports: [PrismaModule],
  controllers: [E2eeDeviceController],
  providers: [
    E2eeDeviceRepository,
    E2eeSignedPreKeyRepository,
    E2eeOneTimePreKeyRepository,
    E2eeDeviceCommandService,
    E2eeDeviceQueryService,
  ],
  exports: [E2eeDeviceCommandService, E2eeDeviceQueryService],
})
export class E2eeDevicesModule {}
