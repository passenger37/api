import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeTransportModule } from '../e2ee-transport/e2ee-transport.module';
import { E2eeMetadataRepository } from './repositories/e2ee-metadata.repository';
import { E2eeMetadataCommandService } from './services/e2ee-metadata-command.service';
import { E2eeMetadataQueryService } from './services/e2ee-metadata-query.service';
import { E2eeMetadataController } from './controllers/e2ee-metadata.controller';

@Module({
  imports: [PrismaModule, E2eeDevicesModule, E2eeTransportModule],
  controllers: [E2eeMetadataController],
  providers: [
    E2eeMetadataRepository,
    E2eeMetadataCommandService,
    E2eeMetadataQueryService,
  ],
  exports: [E2eeMetadataCommandService, E2eeMetadataQueryService],
})
export class E2eeMetadataModule {}
