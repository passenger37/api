import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { CommentCommandService } from '../services/comment-command.service';
import { CommentQueryService } from '../services/comment-query.service';
import { CommentAuthorizationService } from '../services/comment-authorization.service';

import { CreateCommentRequest } from '../dto/request/create-comment.request';
import { ListCommentsQuery, ReactToCommentRequest } from '../dto/query/list-comments.query';
import { CommentResponse, CommentListResponse, CommentReactionResponse } from '../dto/response/comment.response';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class CommentsController {
  constructor(
    private readonly commandService: CommentCommandService,
    private readonly queryService: CommentQueryService,
    private readonly authorizationService: CommentAuthorizationService,
  ) {}

  @Post(':postId/comments')
  @ApiOperation({ summary: 'Create a comment on a post (personal, community or channel)' })
  @ApiParam({ name: 'postId', description: 'Post ID (Post.id or CommunityPost.id)' })
  @ApiResponse({ status: 201, type: CommentResponse })
  async createComment(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<any> {
    const postType = await this.authorizationService.resolvePostType(postId);

    return this.commandService.createComment({
      postId,
      postType,
      authorId: userId,
      content: dto.content,
    });
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'List root comments on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID (Post.id or CommunityPost.id)' })
  @ApiResponse({ status: 200, type: CommentListResponse })
  async listComments(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCommentsQuery,
  ): Promise<CommentListResponse> {
    const postType = await this.authorizationService.resolvePostType(postId);

    return this.queryService.listRootComments(postId, postType, userId, {
      sort: query.sort as any,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Post(':postId/comments/:commentId/replies')
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiParam({ name: 'postId', description: 'Parent post ID' })
  @ApiParam({ name: 'commentId', description: 'Parent comment ID' })
  @ApiResponse({ status: 201, type: CommentResponse })
  async replyToComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<any> {
    const postType = await this.authorizationService.resolvePostType(postId);

    return this.commandService.createComment({
      postId,
      postType,
      authorId: userId,
      content: dto.content,
      parentCommentId: commentId,
    });
  }
}