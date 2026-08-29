import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersModule } from '../servers/servers.module';
import { ChannelMessageRepository } from './repositories/channel-message.repository';
import { ChannelMessageEditRepository } from './repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from './repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from './repositories/channel-read-state.repository';
import { ChannelMentionResolver } from './services/channel-mention-resolver.service';
import { AuthModule } from '../auth/auth.module';
import { ChannelMessageCommandService } from './services/channel-message-command.service';
import { TypingService } from './services/typing.service';
import { ChannelMessageQueryService } from './services/channel-message-query.service';
import { ChannelMessageValidationService } from './services/channel-message-validation.service';
import { ChannelMessageGateway } from './gateways/channel-message.gateway';
import { ChannelMessageController } from './controllers/channel-message.controller';
import { WebSocketJwtGuard } from './gaurds/websocket-jwt.guard';
import { ChannelMessageReactionCommandService } from './services/channel-message-reaction-command.service';
import { ChannelMessageReactionRepository } from './repositories/channel-message-reaction.repository';
import { ChannelMessageReactionQueryService } from './services/channel-message-reaction-query.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
@Module({
  imports: [PrismaModule, ServersModule, AuthModule],
  controllers: [ChannelMessageController],
  providers: [
    ChannelMessageRepository,
    ChannelMessageEditRepository,
    ChannelMentionRepository,
    ChannelReadStateRepository,
    ChannelMentionResolver,
    ChannelMessageValidationService,
    TypingService,
    ChannelMessageQueryService,
    ChannelMessageCommandService,
    ChannelMessageGateway,
    WebSocketJwtGuard,
    ChannelMessageReactionCommandService,
    ChannelMessageReactionRepository,
    ChannelMessageReactionQueryService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],

  exports: [
    ChannelMessageQueryService,
    ChannelMessageCommandService,
    ChannelMessageReactionCommandService,
    ChannelMessageReactionQueryService,
  ],
})
export class MessagesModule {}
