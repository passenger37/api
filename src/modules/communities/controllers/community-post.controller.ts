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
import { CommunityPostService } from '../services/community-post.service';
import { CreatePostRequest } from '../dto/request/create-post.request';
import { UpdatePostRequest } from '../dto/request/update-post.request';
import { CreateCommentRequest } from '../dto/request/create-comment.request';
import { UpdateCommentRequest } from '../dto/request/update-comment.request';
import { ListPostsQuery } from '../dto/query/list-posts.query';
import { ListCommentsQuery } from '../dto/query/list-comments.query';
import { serializePost, serializeComment } from '../mappers/community.mapper';

@ApiTags('communities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunityPostController {
  constructor(private readonly postService: CommunityPostService) {}

  @Post(':slug/posts')
  async createPost(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreatePostRequest,
  ) {
    return this.postService.createPost(slug, userId, request);
  }

  @Get(':slug/posts')
  async listPosts(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListPostsQuery,
  ) {
    return this.postService.listPosts(
      slug,
      userId,
      query.categoryId,
      query.cursor,
      query.limit,
    );
  }

  @Patch(':slug/posts/:postId')
  async updatePost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdatePostRequest,
  ) {
    return this.postService.updatePost(slug, postId, userId, request);
  }

  @Delete(':slug/posts/:postId')
  async deletePost(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.postService.softDeletePost(slug, postId, userId);

    return { deleted: true };
  }

  @Get(':slug/posts/:postId/comments')
  async listComments(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCommentsQuery,
  ) {
    return this.postService.listComments(
      slug,
      postId,
      userId,
      query.cursor,
      query.limit,
    );
  }

  @Post(':slug/posts/:postId/comments')
  async createComment(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateCommentRequest,
  ) {
    return this.postService.createComment(slug, postId, userId, request);
  }

  @Post(':slug/posts/:postId/comments/:commentId/reply')
  async replyToComment(
    @Param('slug') slug: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateCommentRequest,
  ) {
    return this.postService.replyToComment(
      slug,
      postId,
      commentId,
      userId,
      request,
    );
  }

  @Patch(':slug/comments/:commentId')
  async updateComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateCommentRequest,
  ) {
    return this.postService.updateComment(slug, commentId, userId, request);
  }

  @Delete(':slug/comments/:commentId')
  async deleteComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.postService.deleteComment(slug, commentId, userId);

    return { deleted: true };
  }
}
