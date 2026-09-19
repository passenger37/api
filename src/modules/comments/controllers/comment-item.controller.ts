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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { HttpRateLimitGuard } from '../../production-hardening/guards/http-rate-limit.guard';

import { CommentCommandService } from '../services/comment-command.service';
import { CommentQueryService } from '../services/comment-query.service';
import { CommentAuthorizationService } from '../services/comment-authorization.service';
import { CommentModerationService } from '../services/comment-moderation.service';
import { CommentModerationRequest } from '../dto/request/comment-moderation.request';

import { CreateCommentRequest } from '../dto/request/create-comment.request';
import {
  ListCommentsQuery,
  ReactToCommentRequest,
} from '../dto/query/list-comments.query';
import {
  CommentResponse,
  CommentListResponse,
  CommentReactionResponse,
} from '../dto/response/comment.response';
import { CommentSortMode } from '../constants/comment.constants';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HttpRateLimitGuard)
@Controller('comments')
export class CommentItemController {
  constructor(
    private readonly commandService: CommentCommandService,
    private readonly queryService: CommentQueryService,
    private readonly authorizationService: CommentAuthorizationService,
    private readonly moderationService: CommentModerationService,
  ) {}

  @Get(':commentId')
  @ApiOperation({ summary: 'Get a single comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, type: CommentResponse })
  async getComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    return this.queryService.getComment(commentId, userId);
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
      sort: query.sort as CommentSortMode,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, type: CommentResponse })
  async editComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentRequest,
  ): Promise<any> {
    return this.commandService.editComment({
      commentId,
      authorId: userId,
      content: dto.content,
    });
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (soft)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.commandService.deleteComment(commentId, userId);
  }

  @Patch(':commentId/moderate')
  @ApiOperation({ summary: 'Moderate a comment (admin/moderator only)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 204 })
  async moderateComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: CommentModerationRequest,
  ): Promise<void> {
    await this.moderationService.removeComment(commentId, moderatorId);
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
      vote: dto.vote,
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
