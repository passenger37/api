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
import { CommunityPostInteractionService } from '../services/community-post-interaction.service';
import { ListFeedQuery } from '../dto/query/list-feed.query';
import { ListCursorQuery } from '../dto/query/list-cursor.query';
import { CastVoteRequest } from '../dto/request/cast-vote.request';
import { ReportPostRequest } from '../dto/request/report-post.request';
import { ResolveReportRequest } from '../dto/request/resolve-report.request';
import { ModeratePostRequest } from '../dto/request/moderate-post.request';
import { EditPostRequest } from '../dto/request/edit-post.request';

@ApiTags('communities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunityPostInteractionController {
  constructor(
    private readonly interactionService: CommunityPostInteractionService,
  ) {}

  @Get(':slug/posts/:postId/detail')
  async getPostDetail(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.interactionService.getPostDetail(slug, postId, userId);
  }

  @Get(':slug/feed')
  async listFeed(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListFeedQuery,
  ) {
    return this.interactionService.listFeed({
      communityId: await this.interactionService.slugToId(slug),
      viewerId: userId,
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
      categoryId: query.categoryId,
    });
  }

  @Patch(':slug/posts/:postId/edit')
  async editPost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: EditPostRequest,
  ) {
    return this.interactionService.editPost(slug, postId, userId, request);
  }

  @Get(':slug/posts/:postId/edit-history')
  async getEditHistory(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCursorQuery,
  ) {
    return this.interactionService.getEditHistory(
      slug,
      postId,
      userId,
      0,
      query.limit ?? 20,
    );
  }

  @Post(':slug/posts/:postId/vote')
  async votePost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CastVoteRequest,
  ) {
    return this.interactionService.votePost(slug, postId, userId, request.vote);
  }

  @Delete(':slug/posts/:postId/vote')
  async removeVote(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.interactionService.removeVote(slug, postId, userId);
  }

  @Get(':slug/posts/:postId/votes')
  async listVotes(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCursorQuery,
  ) {
    return this.interactionService.listVotes(
      slug,
      postId,
      userId,
      query.cursor,
      query.limit,
    );
  }

  @Post(':slug/posts/:postId/bookmark')
  async bookmarkPost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.interactionService.bookmarkPost(slug, postId, userId);
  }

  @Delete(':slug/posts/:postId/bookmark')
  async removeBookmark(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.interactionService.removeBookmark(slug, postId, userId);
  }

  @Post(':slug/posts/:postId/report')
  async reportPost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ReportPostRequest,
  ) {
    return this.interactionService.reportPost(slug, postId, userId, request);
  }

  @Get(':slug/posts/:postId/reports')
  async listReports(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCursorQuery,
  ) {
    return this.interactionService.listReports(
      slug,
      postId,
      userId,
      query.cursor,
      query.limit,
    );
  }

  @Patch(':slug/reports/:reportId/resolve')
  async resolveReport(
    @Param('slug') slug: string,
    @Param('reportId') reportId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ResolveReportRequest,
  ) {
    return this.interactionService.resolveReport(slug, reportId, userId, request);
  }

  @Post(':slug/posts/:postId/moderate')
  async moderatePost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: ModeratePostRequest,
  ) {
    return this.interactionService.moderatePost(slug, postId, userId, request);
  }
}