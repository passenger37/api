import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommunityCommandService } from '../services/community-command.service';
import { CommunityQueryService } from '../services/community-query.service';
import { CommunityMembershipService } from '../services/community-membership.service';
import { CommunityDiscoveryService } from '../services/community-discovery.service';
import { CommunityPostInteractionService } from '../services/community-post-interaction.service';
import { ListCursorQuery } from '../dto/query/list-cursor.query';
import { CreateCommunityRequest } from '../dto/request/create-community.request';
import { UpdateCommunityRequest } from '../dto/request/update-community.request';
import { CreateCategoryRequest } from '../dto/request/create-category.request';
import { UpdateCategoryRequest } from '../dto/request/update-category.request';
import { SetMutedRequest } from '../dto/request/set-muted.request';
import { ModeratorAssignmentRequest } from '../dto/request/moderator-assignment.request';
import { DiscoverCommunitiesQuery } from '../dto/query/discover-communities.query';
import { ListSubscriptionsQuery } from '../dto/query/list-subscriptions.query';

@ApiTags('communities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunityController {
  constructor(
    private readonly commandService: CommunityCommandService,
    private readonly queryService: CommunityQueryService,
    private readonly membershipService: CommunityMembershipService,
    private readonly discoveryService: CommunityDiscoveryService,
    private readonly interactionService: CommunityPostInteractionService,
  ) {}

  @Get('discover')
  async discover(@Query() query: DiscoverCommunitiesQuery) {
    return this.discoveryService.discover(query.q, query.cursor, query.limit);
  }

  @Get('bookmarks')
  async bookmarks(
    @CurrentUser('id') userId: string,
    @Query() query: ListCursorQuery,
  ) {
    return this.interactionService.listBookmarks(
      userId,
      query.cursor,
      query.limit,
    );
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() request: CreateCommunityRequest,
  ) {
    return this.commandService.create(userId, request);
  }

  @Get('mine')
  async mine(
    @CurrentUser('id') userId: string,
    @Query() query: ListSubscriptionsQuery,
  ) {
    return this.queryService.listSubscribed(userId, query.cursor, query.limit);
  }

  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queryService.getBySlug(slug, userId);
  }

  @Patch(':slug')
  async update(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateCommunityRequest,
  ) {
    return this.commandService.update(slug, userId, request);
  }

  @Delete(':slug')
  async softDelete(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.commandService.softDelete(slug, userId);

    return { deleted: true };
  }

  @Get(':slug/categories')
  async categories(@Param('slug') slug: string) {
    return this.queryService.listCategories(slug);
  }

  @Post(':slug/categories')
  async createCategory(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateCategoryRequest,
  ) {
    return this.commandService.createCategory(slug, userId, request);
  }

  @Patch(':slug/categories/:categoryId')
  async updateCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateCategoryRequest,
  ) {
    return this.commandService.updateCategory(
      slug,
      categoryId,
      userId,
      request,
    );
  }

  @Delete(':slug/categories/:categoryId')
  async deleteCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.commandService.deleteCategory(slug, categoryId, userId);

    return { deleted: true };
  }

  @Post(':slug/subscribe')
  async subscribe(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.membershipService.subscribe(slug, userId);
  }

  @Delete(':slug/subscribe')
  async unsubscribe(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.membershipService.unsubscribe(slug, userId);

    return { unsubscribed: true };
  }

  @Get(':slug/subscription')
  async subscriptionState(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queryService.getSubscriptionState(slug, userId);
  }

  @Patch(':slug/subscription')
  async setMuted(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: SetMutedRequest,
  ) {
    return this.membershipService.setMuted(slug, userId, request.isMuted);
  }

  @Post(':slug/moderators')
  async addModerator(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: ModeratorAssignmentRequest,
  ) {
    await this.commandService.addModerator(
      slug,
      userId,
      request.userId,
      request.role,
    );

    return { added: true };
  }

  @Delete(':slug/moderators/:targetUserId')
  async removeModerator(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    await this.commandService.removeModerator(slug, userId, targetUserId);

    return { removed: true };
  }
}
