import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersModule } from '../servers/servers.module';
import { ChannelMessageRepository } from './repositories/channel-message.repository';
import { AuthModule } from '../auth/auth.module';
import { ChannelMessageCommandService } from './services/channel-message-command.service';
import { ChannelMessageQueryService } from './services/channel-message-query.service';
import { ChannelMessageValidationService } from './services/channel-message-validation.service';
import { ChannelMessageGateway } from './gateways/channel-message.gateway';
import { ChannelMessageController } from './controllers/channel-message.controller';
import { WebSocketJwtGuard } from './gaurds/websocket-jwt.guard';
@Module({
  imports: [PrismaModule, ServersModule, AuthModule],
  controllers: [ChannelMessageController],
  providers: [
    ChannelMessageRepository,
    ChannelMessageValidationService,
    ChannelMessageQueryService,
    ChannelMessageCommandService,
    ChannelMessageGateway,
    WebSocketJwtGuard,
  ],

  exports: [ChannelMessageQueryService, ChannelMessageCommandService],
})
export class MessagesModule {}
