import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';

import { AnonymousChatGateway } from './gateways/anonymous-chat.gateway';
import { AnonymousChatController } from './controllers/anonymous-chat.controller';
import { AnonymousMapper } from './mappers/anonymous-chat.mapper';
import {
  AnonymousChatBanRepository,
  AnonymousChatMessageRepository,
  AnonymousChatParticipantRepository,
  AnonymousChatReportRepository,
  AnonymousChatRoomRepository,
  AnonymousChatSessionRepository,
} from './repositories/anonymous-chat.repository';
import { AnonymousChatCleanupService } from './services/anonymous-chat.cleanup.service';
import { AnonymousChatCommandService } from './services/anonymous-chat.command.service';
import { AnonymousChatMatchmakingService } from './services/anonymous-chat.matchmaking.service';
import { AnonymousChatPolicy } from './services/anonymous-chat.policy';
import { AnonymousChatPresenceService } from './services/anonymous-chat.presence.service';
import { AnonymousChatQueryService } from './services/anonymous-chat.query.service';
import { AnonymousChatRateLimitService } from './services/anonymous-chat.rate-limit.service';
import { AnonymousChatSafetyService } from './services/anonymous-chat.safety.service';
import { AnonymousChatSessionService } from './services/anonymous-chat.session.service';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [AnonymousChatController],
  providers: [
    // Repositories
    AnonymousChatSessionRepository,
    AnonymousChatParticipantRepository,
    AnonymousChatRoomRepository,
    AnonymousChatMessageRepository,
    AnonymousChatReportRepository,
    AnonymousChatBanRepository,
    // Domain services
    AnonymousChatPolicy,
    AnonymousChatRateLimitService,
    AnonymousChatSafetyService,
    AnonymousChatMatchmakingService,
    AnonymousChatSessionService,
    AnonymousChatPresenceService,
    AnonymousChatQueryService,
    AnonymousChatCommandService,
    AnonymousChatCleanupService,
    AnonymousMapper,
    // Realtime transport
    AnonymousChatGateway,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],
  exports: [AnonymousChatCommandService, AnonymousChatQueryService],
})
export class AnonymousChatModule {}
