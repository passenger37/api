import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../../core/database/prisma.module';
import { RedisModule } from '../../core/redis/redis.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { MessagesModule } from '../messages/messages.module';
import { DirectMessagesModule } from '../direct-messages/direct-messages.module';
import { ServersModule } from '../servers/servers.module';

import { PostRepository } from './repositories/post.repository';
import { PostReactionRepository } from './repositories/post-reaction.repository';
import { PostBookmarkRepository } from './repositories/post-bookmark.repository';
import { PostReportRepository } from './repositories/post-report.repository';
import { PostMediaRepository } from './repositories/post-media.repository';
import { PostShareRepository } from './infrastructure/repositories/post-share.repository';

import { PostQueryService } from './services/post-query.service';
import { PostCommandService } from './services/post-command.service';
import { PostSharePolicy } from './domain/policies/post-share.policy';
import { CreatePostShareCommandService } from './application/commands/create-post-share.command.service';

import { PostsController } from './controllers/posts.controller';
import { PostShareController } from './controllers/post-share.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthorizationModule,
    UsersModule,
    MediaModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => DirectMessagesModule),
    forwardRef(() => ServersModule),
    BullModule.registerQueue({ name: 'post-processing' }),
  ],
  controllers: [PostsController, PostShareController],
  providers: [
    PostRepository,
    PostReactionRepository,
    PostBookmarkRepository,
    PostReportRepository,
    PostMediaRepository,
    PostShareRepository,
    PostQueryService,
    PostCommandService,
    PostSharePolicy,
    CreatePostShareCommandService,
  ],
  exports: [
    PostQueryService,
    PostCommandService,
    PostRepository,
    PostReactionRepository,
    PostBookmarkRepository,
    PostReportRepository,
    PostMediaRepository,
    PostShareRepository,
    PostSharePolicy,
    CreatePostShareCommandService,
  ],
})
export class PostsModule {}
