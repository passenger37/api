import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { CommunitiesModule } from '../communities/communities.module';
import { ServersModule } from '../servers/servers.module';
import { ProductionHardeningModule } from '../production-hardening/production-hardening.module';

import { CommentRepository } from './repositories/comment.repository';
import { CommentReactionRepository } from './repositories/comment-reaction.repository';
import { CommentCommandService } from './services/comment-command.service';
import { CommentQueryService } from './services/comment-query.service';
import { CommentAuthorizationService } from './services/comment-authorization.service';
import { CommentNotificationPublisher } from './services/comment-notification.publisher';
import { CommentRealtimePublisher } from './services/comment-realtime.publisher';
import { CommentModerationService } from './services/comment-moderation.service';
import { CommentReportService } from './services/comment-report.service';
import { CommentsController } from './controllers/comments.controller';
import { CommentItemController } from './controllers/comment-item.controller';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    UsersModule,
    CommunitiesModule,
    ServersModule,
    ProductionHardeningModule,
  ],
  controllers: [CommentsController, CommentItemController],
  providers: [
    CommentRepository,
    CommentReactionRepository,
    CommentCommandService,
    CommentQueryService,
    CommentAuthorizationService,
    CommentNotificationPublisher,
    CommentRealtimePublisher,
    CommentModerationService,
    CommentReportService,
  ],
  exports: [
    CommentRepository,
    CommentReactionRepository,
    CommentCommandService,
    CommentQueryService,
    CommentAuthorizationService,
    CommentNotificationPublisher,
    CommentRealtimePublisher,
    CommentModerationService,
    CommentReportService,
  ],
})
export class CommentsModule {}
