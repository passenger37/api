import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

import { DirectMessageChannelRepository } from './repositories/direct-message-channel.repository';
import { DirectMessageRepository } from './repositories/direct-message.repository';
import { DirectMessageReadStateRepository } from './repositories/direct-message-read-state.repository';
import { DmCommandService } from './services/dm-command.service';
import { DmQueryService } from './services/dm-query.service';
import { DmGateway } from './gateways/dm.gateway';
import { DirectMessageController } from './controllers/direct-message.controller';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [DirectMessageController],
  providers: [
    DirectMessageChannelRepository,
    DirectMessageRepository,
    DirectMessageReadStateRepository,
    DmCommandService,
    DmQueryService,
    DmGateway,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],

  exports: [DmCommandService, DmQueryService],
})
export class DirectMessagesModule {}
