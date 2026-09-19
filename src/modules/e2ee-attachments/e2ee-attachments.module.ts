import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { E2eeSessionsModule } from '../e2ee-sessions/e2ee-sessions.module';
import { E2eeGroupsModule } from '../e2ee-groups/e2ee-groups.module';
import { E2eeDevicesModule } from '../e2ee-devices/e2ee-devices.module';
import { AttachmentStorageService } from '../messages/services/attachment-storage.service';
import { E2eeAttachmentRepository } from './repositories/e2ee-attachment.repository';
import { E2eeAttachmentCommandService } from './services/e2ee-attachment-command.service';
import { E2eeAttachmentQueryService } from './services/e2ee-attachment-query.service';
import { E2eeAttachmentController } from './controllers/e2ee-attachment.controller';

@Module({
  imports: [
    PrismaModule,
    E2eeSessionsModule,
    E2eeGroupsModule,
    E2eeDevicesModule,
  ],
  controllers: [E2eeAttachmentController],
  providers: [
    AttachmentStorageService,
    E2eeAttachmentRepository,
    E2eeAttachmentCommandService,
    E2eeAttachmentQueryService,
  ],
  exports: [E2eeAttachmentCommandService, E2eeAttachmentQueryService],
})
export class E2eeAttachmentsModule {}
