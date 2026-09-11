import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SearchModule } from '../search/search.module';
import { TypingService } from '../messages/services/typing.service';

import { DirectMessageChannelRepository } from './repositories/direct-message-channel.repository';
import { DirectMessageRepository } from './repositories/direct-message.repository';
import { DirectMessageReadStateRepository } from './repositories/direct-message-read-state.repository';
import { DmCommandService } from './services/dm-command.service';
import { DmQueryService } from './services/dm-query.service';
import { SystemDmService } from './services/system-dm.service';
import { DmGateway } from './gateways/dm.gateway';
import { DirectMessageController } from './controllers/direct-message.controller';
import { SystemDmController } from './controllers/system-dm.controller';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    SearchModule,
  ],
  controllers: [DirectMessageController, SystemDmController],
  providers: [
    DirectMessageChannelRepository,
    DirectMessageRepository,
    DirectMessageReadStateRepository,
    DmCommandService,
    DmQueryService,
    SystemDmService,
    RolesGuard,
    DmGateway,
    TypingService,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],

  exports: [DmCommandService, DmQueryService, SystemDmService, DirectMessageChannelRepository],
})
export class DirectMessagesModule {}
