import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../../core/database/prisma.module';
import { RedisModule } from '../../core/redis/redis.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { MessagesModule } from '../messages/messages.module';

import { PostRepository } from './repositories/post.repository';
import { PostReactionRepository } from './repositories/post-reaction.repository';
import { PostBookmarkRepository } from './repositories/post-bookmark.repository';
import { PostReportRepository } from './repositories/post-report.repository';
import { PostMediaRepository } from './repositories/post-media.repository';

import { PostQueryService } from './services/post-query.service';
import { PostCommandService } from './services/post-command.service';

import { PostsController } from './controllers/posts.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthorizationModule,
    UsersModule,
    MediaModule,
    forwardRef(() => MessagesModule),
    BullModule.registerQueue(
      { name: 'post:processing' },
    ),
  ],
  controllers: [PostsController],
  providers: [
    PostRepository,
    PostReactionRepository,
    PostBookmarkRepository,
    PostReportRepository,
    PostMediaRepository,
    PostQueryService,
    PostCommandService,
  ],
  exports: [
    PostQueryService,
    PostCommandService,
    PostRepository,
    PostReactionRepository,
    PostBookmarkRepository,
    PostReportRepository,
    PostMediaRepository,
  ],
})
export class PostsModule {}