import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { PostQueryService } from '../services/post-query.service';
import { PostCommandService } from '../services/post-command.service';

import { CreatePostDto, UpdatePostDto, ReactToPostDto, ReportPostDto, CreateRepostDto, CreateQuotePostDto } from '../dto/request/create-post.request';
import { GetPostsQuery, GetUserPostsQuery, GetReactionsQuery, GetReportsQuery } from '../dto/request/post-query.dto';

import { PostDetailResponse, PostListResponse, ReactionDto, PostReportDto } from '../dto/response/post.response';
import { CursorPaginatedResponseDto } from '../dto/response/cursor-pagination.response';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly queryService: PostQueryService,
    private readonly commandService: PostCommandService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, type: PostDetailResponse })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostDetailResponse> {
    return this.commandService.createPost({
      authorId: userId,
      content: dto.content,
      visibility: dto.visibility,
      mediaIds: dto.media?.map(m => m.id),
      contentWarning: dto.contentWarning,
      isSensitive: dto.isSensitive,
      language: dto.language,
      scheduledAt: dto.scheduledAt,
    });
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Cannot view this post' })
  async getPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PostDetailResponse> {
    return this.queryService.getPostById(postId, userId);
  }

  @Patch(':postId')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Cannot edit this post' })
  async updatePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostDetailResponse> {
    return this.commandService.updatePost(postId, userId, {
      content: dto.content,
      visibility: dto.visibility,
      contentWarning: dto.contentWarning,
      isSensitive: dto.isSensitive,
      language: dto.language,
    });
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 204, description: 'Post deleted' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete this post' })
  async deletePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.commandService.deletePost(postId, userId);
  }

  @Post(':postId/restore')
  @ApiOperation({ summary: 'Restore a deleted post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Cannot restore this post' })
  async restorePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PostDetailResponse> {
    return this.commandService.restorePost(postId, userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts per page (max 50)' })
  @ApiQuery({ name: 'visibility', required: false, isArray: true, enum: ['PUBLIC', 'FOLLOWERS', 'FRIENDS', 'PRIVATE'] })
  @ApiResponse({ status: 200, type: CursorPaginatedResponseDto })
  async getUserPosts(
    @Param('userId') userId: string,
    @CurrentUser('id') viewerId: string,
    @Query() query: GetUserPostsQuery,
  ): Promise<CursorPaginatedResponseDto<PostListResponse>> {
    return this.queryService.getUserPosts(userId, {
      viewerId,
      authorId: userId,
      cursor: query.cursor,
      limit: query.limit,
      visibility: query.visibility,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get public posts (explore)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts per page (max 50)' })
  @ApiQuery({ name: 'authorId', required: false, description: 'Filter by author' })
  @ApiQuery({ name: 'tag', required: false, description: 'Filter by hashtag' })
  @ApiResponse({ status: 200, type: CursorPaginatedResponseDto })
  async getPublicPosts(
    @CurrentUser('id') viewerId: string,
    @Query() query: GetPostsQuery,
  ): Promise<CursorPaginatedResponseDto<PostListResponse>> {
    return this.queryService.getPublicPosts({
      viewerId,
      cursor: query.cursor,
      limit: query.limit,
      authorId: query.authorId,
      tag: query.tag,
    });
  }

  @Get(':postId/reposts')
  @ApiOperation({ summary: 'Get reposts of a post' })
  @ApiParam({ name: 'postId', description: 'Original post ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: CursorPaginatedResponseDto<PostListResponse> })
  async getReposts(
    @Param('postId') postId: string,
    @CurrentUser('id') viewerId: string,
    @Query() query: GetPostsQuery,
  ): Promise<CursorPaginatedResponseDto<PostListResponse>> {
    return this.queryService.getReposts(postId, viewerId, query.cursor, query.limit);
  }

  @Get(':postId/quotes')
  @ApiOperation({ summary: 'Get quote posts of a post' })
  @ApiParam({ name: 'postId', description: 'Quoted post ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: CursorPaginatedResponseDto<PostListResponse> })
  async getQuotes(
    @Param('postId') postId: string,
    @CurrentUser('id') viewerId: string,
    @Query() query: GetPostsQuery,
  ): Promise<CursorPaginatedResponseDto<PostListResponse>> {
    return this.queryService.getQuotes(postId, viewerId, query.cursor, query.limit);
  }

  @Get('bookmarks/me')
  @ApiOperation({ summary: 'Get current user\'s bookmarked posts' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: CursorPaginatedResponseDto<PostListResponse> })
  async getBookmarks(
    @CurrentUser('id') viewerId: string,
    @Query() query: GetPostsQuery,
  ): Promise<CursorPaginatedResponseDto<PostListResponse>> {
    return this.queryService.getBookmarkedPosts(viewerId, query.cursor, query.limit);
  }

  // Reactions
  @Post(':postId/reactions')
  @ApiOperation({ summary: 'Add or update reaction to a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Reaction added/updated' })
  async reactToPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReactToPostDto,
  ) {
    return this.commandService.reactToPost(postId, userId, dto.type);
  }

  @Delete(':postId/reactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove reaction from a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 204, description: 'Reaction removed' })
  async removeReaction(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.commandService.removeReaction(postId, userId);
  }

  @Get(':postId/reactions')
  @ApiOperation({ summary: 'Get reactions on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'FIRE', 'CELEBRATE'] })
  @ApiResponse({ status: 200, description: 'Reactions retrieved' })
  async getReactions(
    @Param('postId') postId: string,
    @CurrentUser('id') viewerId: string,
    @Query() query: GetReactionsQuery,
  ): Promise<CursorPaginatedResponseDto<ReactionDto>> {
    return this.queryService.getPostReactions(postId, viewerId, query.cursor, query.limit, query.type);
  }

  // Bookmarks
  @Post(':postId/bookmark')
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post bookmarked' })
  async bookmarkPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.commandService.bookmarkPost(postId, userId);
  }

  @Delete(':postId/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 204, description: 'Bookmark removed' })
  async removeBookmark(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.commandService.removeBookmark(postId, userId);
  }

  // Reports
  @Post(':postId/report')
  @ApiOperation({ summary: 'Report a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post reported' })
  async reportPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportPostDto,
  ): Promise<void> {
    return this.commandService.reportPost(postId, userId, dto.reason, dto.detailText);
  }

  @Get(':postId/reports')
  @ApiOperation({ summary: 'Get reports on a post (author only)' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] })
  @ApiResponse({ status: 200, description: 'Reports retrieved' })
  async getReports(
    @Param('postId') postId: string,
    @CurrentUser('id') viewerId: string,
    @Query() query: GetReportsQuery,
  ): Promise<CursorPaginatedResponseDto<PostReportDto>> {
    return this.queryService.getPostReportReports(postId, viewerId, query.cursor, query.limit);
  }

  // Reposts
  @Post(':postId/repost')
  @ApiOperation({ summary: 'Repost a post' })
  @ApiParam({ name: 'postId', description: 'Post ID to repost' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  async createRepost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRepostDto,
  ): Promise<PostDetailResponse> {
    return this.commandService.createRepost(postId, userId, dto.content);
  }

  @Delete(':postId/repost')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove repost' })
  @ApiParam({ name: 'postId', description: 'Original post ID' })
  @ApiResponse({ status: 204, description: 'Repost removed' })
  async removeRepost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.commandService.removeRepost(postId, userId);
  }

  // Quote posts
  @Post(':postId/quote')
  @ApiOperation({ summary: 'Quote a post' })
  @ApiParam({ name: 'postId', description: 'Post ID to quote' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  async createQuotePost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuotePostDto,
  ): Promise<PostDetailResponse> {
    return this.commandService.createQuotePost(postId, userId, dto.content, dto.visibility);
  }
}