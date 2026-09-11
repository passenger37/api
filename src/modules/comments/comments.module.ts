import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { CommunitiesModule } from '../communities/communities.module';
import { ServersModule } from '../servers/servers.module';
import { PostsModule } from '../posts/posts.module';

import { CommentRepository } from './repositories/comment.repository';
import { CommentReactionRepository } from './repositories/comment-reaction.repository';
import { CommentCommandService } from './services/comment-command.service';
import { CommentQueryService } from './services/comment-query.service';
import { CommentAuthorizationService } from './services/comment-authorization.service';
import { CommentsController } from './controllers/comments.controller';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    UsersModule,
    forwardRef(() => PostsModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => ServersModule),
  ],
  controllers: [CommentsController],
  providers: [
    CommentRepository,
    CommentReactionRepository,
    CommentCommandService,
    CommentQueryService,
    CommentAuthorizationService,
  ],
  exports: [
    CommentRepository,
    CommentReactionRepository,
    CommentCommandService,
    CommentQueryService,
    CommentAuthorizationService,
  ],
})
export class CommentsModule {}