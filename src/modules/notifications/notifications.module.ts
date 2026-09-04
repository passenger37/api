import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';

import { NotificationRepository } from './repositories/notification.repository';
import { NotificationPreferenceRepository } from './repositories/notification-preference.repository';
import { NotificationDeliveryRepository } from './repositories/notification-delivery.repository';
import { NotificationCommandService } from './services/notification-command.service';
import { NotificationQueryService } from './services/notification-query.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationEventListenerService } from './services/notification-event-listener.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationController } from './controllers/notification.controller';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, AuthorizationModule],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    NotificationPreferenceRepository,
    NotificationDeliveryRepository,
    NotificationCommandService,
    NotificationQueryService,
    NotificationPreferenceService,
    NotificationDeliveryService,
    NotificationEventListenerService,
    NotificationGateway,
    WebSocketJwtGuard,
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
  ],

  exports: [
    NotificationCommandService,
    NotificationQueryService,
    NotificationPreferenceService,
  ],
})
export class NotificationsModule {}
