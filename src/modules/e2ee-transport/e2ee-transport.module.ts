import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeSessionsModule } from '../e2ee-sessions/e2ee-sessions.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeEnvelopeRepository } from './repositories/e2ee-envelope.repository';
import { E2eeTransportCommandService } from './services/e2ee-transport-command.service';
import { E2eeTransportQueryService } from './services/e2ee-transport-query.service';
import { E2eeTransportController } from './controllers/e2ee-transport.controller';

@Module({
  imports: [PrismaModule, E2eeSessionsModule, E2eeDevicesModule],
  controllers: [E2eeTransportController],
  providers: [
    E2eeEnvelopeRepository,
    E2eeTransportCommandService,
    E2eeTransportQueryService,
  ],
  exports: [E2eeTransportCommandService, E2eeTransportQueryService],
})
export class E2eeTransportModule {}