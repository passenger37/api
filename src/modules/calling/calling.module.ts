import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ServersModule } from '../servers/servers.module';
import { DirectMessagesModule } from '../direct-messages/direct-messages.module';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';

import { CallRepository, CallParticipantRepository } from './repositories/call.repository';
import { CallCommandService } from './services/call-command.service';
import { CallQueryService } from './services/call-query.service';
import { CallAuthorizationService } from './services/call-authorization.service';
import { CallingNotificationPublisher } from './services/calling-notification-publisher.service';
import { CallingGateway } from './gateways/calling.gateway';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    ServersModule,
    DirectMessagesModule,
  ],
  providers: [
    CallRepository,
    CallParticipantRepository,
    CallCommandService,
    CallQueryService,
    CallAuthorizationService,
    CallingNotificationPublisher,
    CallingGateway,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],
  exports: [CallCommandService, CallQueryService],
})
export class CallingModule {}