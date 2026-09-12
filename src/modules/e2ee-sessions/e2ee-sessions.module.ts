import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeKeyDistributionModule } from '../e2ee-key-distribution/e2ee-key-distribution.module';
import { E2eeSessionRepository } from './repositories/e2ee-session.repository';
import { E2eeSessionCommandService } from './services/e2ee-session-command.service';
import { E2eeSessionQueryService } from './services/e2ee-session-query.service';
import { E2eeSessionController } from './controllers/e2ee-session.controller';
import { E2eeOneTimePreKeyRepository } from '../e2ee-devices/repositories/e2ee-one-time-prekey.repository';
import { E2eeSignedPreKeyRepository } from '../e2ee-devices/repositories/e2ee-signed-prekey.repository';

@Module({
  imports: [PrismaModule, E2eeDevicesModule, E2eeKeyDistributionModule],
  controllers: [E2eeSessionController],
  providers: [
    E2eeSessionRepository,
    E2eeSessionCommandService,
    E2eeSessionQueryService,
    E2eeOneTimePreKeyRepository,
    E2eeSignedPreKeyRepository,
  ],
  exports: [
    E2eeSessionQueryService,
    E2eeSessionCommandService,
    E2eeSessionRepository,
  ],
})
export class E2eeSessionsModule {}
