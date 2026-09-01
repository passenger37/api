import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeRevocationRepository } from './repositories/e2ee-revocation.repository';
import { E2eeRevocationCommandService } from './services/e2ee-revocation-command.service';
import { E2eeRevocationQueryService } from './services/e2ee-revocation-query.service';
import { E2eeRevocationController } from './controllers/e2ee-revocation.controller';

@Module({
  imports: [PrismaModule, E2eeDevicesModule],
  controllers: [E2eeRevocationController],
  providers: [
    E2eeRevocationRepository,
    E2eeRevocationCommandService,
    E2eeRevocationQueryService,
  ],
  exports: [E2eeRevocationCommandService, E2eeRevocationQueryService],
})
export class E2eeRevocationModule {}