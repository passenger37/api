import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';

import { ServersModule } from '../servers/servers.module';
import { UsersModule } from '../users/users.module';
import { SearchModule } from '../search/search.module';
import { ChannelMessageRepository } from './repositories/channel-message.repository';
import { ChannelMessageEditRepository } from './repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from './repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from './repositories/channel-read-state.repository';
import { ChannelMentionResolver } from './services/channel-mention-resolver.service';
import { AuthModule } from '../auth/auth.module';
import { ChannelMessageCommandService } from './services/channel-message-command.service';
import { TypingService } from './services/typing.service';
import { PresenceService } from './services/presence.service';
import { PresenceGateway } from './gateways/presence.gateway';
import { ChannelMessageQueryService } from './services/channel-message-query.service';
import { ChannelMessageValidationService } from './services/channel-message-validation.service';
import { ChannelMessageGateway } from './gateways/channel-message.gateway';
import { ChannelMessageController } from './controllers/channel-message.controller';
import { WebSocketJwtGuard } from '../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../common/websocket/auth/websocket-connection-limit.service';
import { ChannelMessageReactionCommandService } from './services/channel-message-reaction-command.service';
import { ChannelMessageReactionRepository } from './repositories/channel-message-reaction.repository';
import { ChannelMessageReactionQueryService } from './services/channel-message-reaction-query.service';
import { WebSocketRateLimitService } from '../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketErrorNormalizer } from '../../common/websocket/error/websocket-error.normalizer';
import { OutboxEventRepository } from './repositories/outbox-event.repository';
import { OutboxPublisherService } from './services/outbox-publisher.service';
import { ChannelMessageSearchService } from './services/channel-message-search.service';
import { MessageAttachmentService } from './services/message-attachment.service';
import { AttachmentStorageService } from './services/attachment-storage.service';
import { AttachmentValidationService } from './services/attachment-validation.service';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { MessageAttachmentController } from './controllers/message-attachment.controller';
import { MessageSpamControlService } from './services/message-spam-control.service';
import { ChannelMessageCacheService } from './services/channel-message-cache.service';
@Module({
  imports: [PrismaModule, ServersModule, AuthModule, UsersModule, SearchModule],
  controllers: [ChannelMessageController, MessageAttachmentController],
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
    WebSocketConnectionAuthService,
    WebSocketConnectionLimitService,
    PresenceService,
    PresenceGateway,
    ChannelMessageReactionCommandService,
    ChannelMessageReactionRepository,
    ChannelMessageReactionQueryService,
    WebSocketRateLimitService,
    WebSocketErrorNormalizer,
    OutboxEventRepository,
    OutboxPublisherService,
    ChannelMessageSearchService,
    MessageAttachmentService,
    AttachmentStorageService,
    AttachmentValidationService,
    MessageAttachmentRepository,
    MessageSpamControlService,
    ChannelMessageCacheService,
  ],

  exports: [
    ChannelMessageQueryService,
    ChannelMessageCommandService,
    ChannelMessageReactionCommandService,
    ChannelMessageReactionQueryService,
    ChannelMessageValidationService,
    OutboxEventRepository,
  ],
})
export class MessagesModule {}
