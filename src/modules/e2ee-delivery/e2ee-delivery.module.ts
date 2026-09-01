import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeTransportModule } from '../e2ee-transport/e2ee-transport.module';
import { E2eeGroupsModule } from '../e2ee-groups/e2ee-groups.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { E2eeDeliveryRepository } from './repositories/e2ee-delivery.repository';
import { E2eeDeliveryCommandService } from './services/e2ee-delivery-command.service';
import { E2eeDeliveryQueryService } from './services/e2ee-delivery-query.service';
import { E2eeDeliveryController } from './controllers/e2ee-delivery.controller';

@Module({
  imports: [PrismaModule, E2eeTransportModule, E2eeGroupsModule, E2eeDevicesModule],
  controllers: [E2eeDeliveryController],
  providers: [
    E2eeDeliveryRepository,
    E2eeDeliveryCommandService,
    E2eeDeliveryQueryService,
  ],
  exports: [E2eeDeliveryCommandService, E2eeDeliveryQueryService],
})
export class E2eeDeliveryModule {}