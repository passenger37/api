import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ServersModule } from '../servers/servers.module';

import { CommunityRepository } from './repositories/community.repository';
import { CommunityCategoryRepository } from './repositories/community-category.repository';
import { CommunitySubscriptionRepository } from './repositories/community-subscription.repository';
import { CommunityModeratorRepository } from './repositories/community-moderator.repository';
import { CommunityPostRepository } from './repositories/community-post.repository';
import { CommunityCommentRepository } from './repositories/community-comment.repository';
import { CommunityModerationActionRepository } from './repositories/community-moderation-action.repository';
import { CommunityPostVoteRepository } from './repositories/community-post-vote.repository';
import { CommunityPostMediaRepository } from './repositories/community-post-media.repository';
import { CommunityPostHashtagRepository } from './repositories/community-post-hashtag.repository';
import { CommunityPostMentionRepository } from './repositories/community-post-mention.repository';
import { CommunityPostReportRepository } from './repositories/community-post-report.repository';
import { CommunityPostBookmarkRepository } from './repositories/community-post-bookmark.repository';
import { CommunityPostEditHistoryRepository } from './repositories/community-post-edit-history.repository';

import { CommunitySlugService } from './services/community-slug.service';
import { CommunityAccessService } from './services/community-access.service';
import { CommunityCommandService } from './services/community-command.service';
import { CommunityQueryService } from './services/community-query.service';
import { CommunityMembershipService } from './services/community-membership.service';
import { CommunityPostService } from './services/community-post.service';
import { CommunityPostInteractionService } from './services/community-post-interaction.service';
import { CommunityModerationService } from './services/community-moderation.service';
import { CommunityDiscoveryService } from './services/community-discovery.service';
import { CommunityRoomResolverService } from './services/community-room-resolver.service';

import { CommunityEventPublisher } from './events/community-event-publisher';

import { CommunityPostModerationPolicy } from './domain/policies/community-post-moderation.policy';

import { CommunityController } from './controllers/community.controller';
import { CommunityPostController } from './controllers/community-post.controller';
import { CommunityPostInteractionController } from './controllers/community-post-interaction.controller';
import { CommunityModerationController } from './controllers/community-moderation.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule, ServersModule],
  controllers: [
    CommunityController,
    CommunityPostController,
    CommunityPostInteractionController,
    CommunityModerationController,
  ],
  providers: [
    CommunityRepository,
    CommunityCategoryRepository,
    CommunitySubscriptionRepository,
    CommunityModeratorRepository,
    CommunityPostRepository,
    CommunityCommentRepository,
    CommunityModerationActionRepository,
    CommunityPostVoteRepository,
    CommunityPostMediaRepository,
    CommunityPostHashtagRepository,
    CommunityPostMentionRepository,
    CommunityPostReportRepository,
    CommunityPostBookmarkRepository,
    CommunityPostEditHistoryRepository,
    CommunitySlugService,
    CommunityAccessService,
    CommunityCommandService,
    CommunityQueryService,
    CommunityMembershipService,
    CommunityPostService,
    CommunityPostInteractionService,
    CommunityModerationService,
    CommunityDiscoveryService,
    CommunityRoomResolverService,
    CommunityEventPublisher,
    CommunityPostModerationPolicy,
  ],
  exports: [
    CommunityCommandService,
    CommunityQueryService,
    CommunityPostService,
    CommunityPostInteractionService,
    CommunityDiscoveryService,
    CommunityEventPublisher,
    CommunityRoomResolverService,
  ],
})
export class CommunitiesModule {}
