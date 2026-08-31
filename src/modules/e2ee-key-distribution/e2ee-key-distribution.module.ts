import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { KeyDistributionRepository } from './repositories/key-distribution.repository';
import { KeyDistributionQueryService } from './services/key-distribution-query.service';
import { KeyDistributionCommandService } from './services/key-distribution-command.service';
import { KeyDistributionController } from './controllers/key-distribution.controller';
import { E2eeOneTimePreKeyRepository } from '../e2ee-devices/repositories/e2ee-one-time-prekey.repository';

@Module({
  imports: [PrismaModule, E2eeDevicesModule],
  controllers: [KeyDistributionController],
  providers: [
    KeyDistributionRepository,
    KeyDistributionQueryService,
    KeyDistributionCommandService,
    E2eeOneTimePreKeyRepository,
  ],
  exports: [KeyDistributionQueryService, KeyDistributionCommandService],
})
export class E2eeKeyDistributionModule {}
