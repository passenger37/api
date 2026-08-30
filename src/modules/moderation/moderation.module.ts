import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersModule } from '../servers/servers.module';
import { MessagesModule } from '../messages/messages.module';

import { MessageReportRepository } from './repositories/message-report.repository';
import { UserReportRepository } from './repositories/user-report.repository';
import { ReportService } from './services/report.service';
import { ModerationReportController } from './controllers/moderation-report.controller';

@Module({
  imports: [PrismaModule, ServersModule, MessagesModule],

  controllers: [ModerationReportController],

  providers: [MessageReportRepository, UserReportRepository, ReportService],

  exports: [ReportService],
})
export class ModerationModule {}
