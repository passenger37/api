import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersModule } from '../servers/servers.module';

import { ChannelMessageRepository } from './repositories/channel-message.repository';

import { ChannelMessageCommandService } from './services/channel-message-command.service';
import { ChannelMessageQueryService } from './services/channel-message-query.service';
import { ChannelMessageValidationService } from './services/channel-message-validation.service';

@Module({
  imports: [PrismaModule, ServersModule],

  providers: [
    ChannelMessageRepository,
    ChannelMessageValidationService,
    ChannelMessageQueryService,
    ChannelMessageCommandService,
  ],

  exports: [ChannelMessageQueryService, ChannelMessageCommandService],
})
export class MessagesModule {}
