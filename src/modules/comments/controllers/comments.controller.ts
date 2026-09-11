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

import { CreateCommentRequest } from '../dto/request/create-comment.request';
import { ListCommentsQuery, ReactToCommentRequest } from '../dto/query/list-comments.query';
import { CommentResponse, CommentListResponse, CommentReactionResponse } from '../dto/response/comment.response';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commandService: CommentCommandService,
    private readonly queryService: CommentQueryService,
  ) {}

  @Post('post/:postId')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 201, type: CommentResponse })
  async createComment(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<CommentResponse> {
    // TODO Phase 4: resolve postType from postId, check visibility
    return this.commandService.createComment({
      postId,
      postType: 'PERSONAL' as any,
      authorId: userId,
      content: dto.content,
    }) as any;
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'List comments on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, type: CommentListResponse })
  async listComments(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCommentsQuery,
  ): Promise<CommentListResponse> {
    // TODO Phase 4: resolve postType from postId
    return this.queryService.listRootComments(postId, 'PERSONAL' as any, userId, {
      sort: query.sort as any,
      limit: query.limit,
      cursor: query.cursor,
    }) as any;
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: 'List replies to a comment' })
  @ApiParam({ name: 'commentId', description: 'Parent comment ID' })
  @ApiResponse({ status: 200, type: CommentListResponse })
  async listReplies(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListCommentsQuery,
  ): Promise<CommentListResponse> {
    return this.queryService.listReplies(commentId, userId, {
      sort: query.sort as any,
      limit: query.limit,
      cursor: query.cursor,
    }) as any;
  }

  @Post(':commentId/replies')
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiParam({ name: 'commentId', description: 'Parent comment ID' })
  @ApiResponse({ status: 201, type: CommentResponse })
  async replyToComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<CommentResponse> {
    // TODO Phase 4: resolve postId from parent comment, validate cross-post
    const parent = await this.commandService['commentRepository'].findById(commentId);
    return this.commandService.createComment({
      postId: parent?.postId ?? '',
      postType: (parent?.postType as any) ?? 'PERSONAL',
      authorId: userId,
      content: dto.content,
      parentCommentId: commentId,
    }) as any;
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, type: CommentResponse })
  async editComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<CommentResponse> {
    return this.commandService.editComment({
      commentId,
      authorId: userId,
      content: dto.content,
    }) as any;
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.commandService.deleteComment(commentId, userId);
  }

  @Post(':commentId/reactions')
  @ApiOperation({ summary: 'React to a comment (upvote/downvote)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 201, type: CommentReactionResponse })
  async reactToComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReactToCommentRequest,
  ): Promise<CommentReactionResponse> {
    const result = await this.commandService.reactToComment({
      commentId,
      userId,
      vote: dto.vote as any,
    });
    return { vote: result.vote, scoreDelta: result.scoreDelta };
  }

  @Delete(':commentId/reactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove reaction from a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async removeReaction(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.commandService.removeReaction(commentId, userId);
  }
}
