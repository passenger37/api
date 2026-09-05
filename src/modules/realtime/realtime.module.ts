import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ServersModule } from '../servers/servers.module';

import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';

import { RealtimePresenceService } from './services/realtime-presence.service';
import { RealtimeTypingService } from './services/realtime-typing.service';
import { RealtimeAccessService } from './services/realtime-access.service';
import { RealtimeEventBridgeService } from './services/realtime-event-bridge.service';
import { RealtimeGateway } from './gateways/realtime.gateway';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    ServersModule,
  ],
  providers: [
    RealtimePresenceService,
    RealtimeTypingService,
    RealtimeAccessService,
    RealtimeEventBridgeService,
    RealtimeGateway,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],
  exports: [
    RealtimePresenceService,
    RealtimeTypingService,
    RealtimeAccessService,
  ],
})
export class RealtimeModule {}