import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeGroupRepository } from './repositories/e2ee-group.repository';
import { E2eeGroupCommandService } from './services/e2ee-group-command.service';
import { E2eeGroupQueryService } from './services/e2ee-group-query.service';
import { E2eeGroupController } from './controllers/e2ee-group.controller';

@Module({
  imports: [PrismaModule, E2eeDevicesModule],
  controllers: [E2eeGroupController],
  providers: [
    E2eeGroupRepository,
    E2eeGroupCommandService,
    E2eeGroupQueryService,
  ],
  exports: [E2eeGroupCommandService, E2eeGroupQueryService],
})
export class E2eeGroupsModule {}