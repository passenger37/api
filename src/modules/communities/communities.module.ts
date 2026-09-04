import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/database/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';

import { CommunityRepository } from './repositories/community.repository';
import { CommunityCategoryRepository } from './repositories/community-category.repository';
import { CommunitySubscriptionRepository } from './repositories/community-subscription.repository';
import { CommunityModeratorRepository } from './repositories/community-moderator.repository';
import { CommunityPostRepository } from './repositories/community-post.repository';
import { CommunityCommentRepository } from './repositories/community-comment.repository';
import { CommunityModerationActionRepository } from './repositories/community-moderation-action.repository';

import { CommunitySlugService } from './services/community-slug.service';
import { CommunityAccessService } from './services/community-access.service';
import { CommunityCommandService } from './services/community-command.service';
import { CommunityQueryService } from './services/community-query.service';
import { CommunityMembershipService } from './services/community-membership.service';
import { CommunityPostService } from './services/community-post.service';
import { CommunityModerationService } from './services/community-moderation.service';
import { CommunityDiscoveryService } from './services/community-discovery.service';

import { CommunityController } from './controllers/community.controller';
import { CommunityPostController } from './controllers/community-post.controller';
import { CommunityModerationController } from './controllers/community-moderation.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [
    CommunityController,
    CommunityPostController,
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
    CommunitySlugService,
    CommunityAccessService,
    CommunityCommandService,
    CommunityQueryService,
    CommunityMembershipService,
    CommunityPostService,
    CommunityModerationService,
    CommunityDiscoveryService,
  ],
  exports: [
    CommunityCommandService,
    CommunityQueryService,
    CommunityPostService,
    CommunityDiscoveryService,
  ],
})
export class CommunitiesModule {}
