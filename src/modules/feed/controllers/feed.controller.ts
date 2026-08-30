import { Controller, Get, Query } from '@nestjs/common';

import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FeedService } from '../services/feed.service';

import { GetFeedQuery } from '../dto/request/get-feed.query';

import { FeedResponse } from '../dto/response/feed.response';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Feed')
@Controller({
  path: 'feed',
  version: '1',
})
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({
    summary: 'Get message-activity feed',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['latest', 'following'],
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 25,
  })
  @ApiOkResponse({
    description: 'Feed items retrieved successfully.',
    type: FeedResponse,
  })
  async getFeed(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetFeedQuery,
  ): Promise<FeedResponse> {
    return this.feedService.getFeed(user.sub, query);
  }
}
