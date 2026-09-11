import { Controller, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { CreatePostShareCommandService } from '../application/commands/create-post-share.command.service';
import { CreatePostShareDto } from '../dto/request/create-post-share.request';
import { CreatePostShareResponse } from '../mappers/post-share.mapper';

@ApiTags('Posts - Shares')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostShareController {
  constructor(
    private readonly createPostShareCommandService: CreatePostShareCommandService,
  ) {}

  @Post(':postId/shares')
  @ApiOperation({ summary: 'Share a post to a Nexus destination' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Post shared successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Cannot share this post' })
  @ApiResponse({ status: 404, description: 'Post or destination not found' })
  async createShare(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostShareDto,
  ): Promise<{ shareId: string; postId: string; destinationType: string }> {
    const result = await this.createPostShareCommandService.createPostShare({
      actorId: userId,
      postId,
      destinationType: dto.destinationType,
      destinationId: dto.destinationId,
      clientRequestId: dto.clientRequestId,
    });

    return {
      shareId: result.shareId,
      postId: result.postId,
      destinationType: result.destinationType,
    };
  }

  @Get(':postId/share-link')
  @ApiOperation({ summary: 'Get share link for a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Share link generated' })
  @ApiResponse({ status: 403, description: 'Cannot generate link for this post' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getShareLink(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ link: string }> {
    // TODO: Implement share link generation
    // This typically doesn't create a PostShare record
    return { link: `https://nexus.app/posts/${postId}` };
  }
}