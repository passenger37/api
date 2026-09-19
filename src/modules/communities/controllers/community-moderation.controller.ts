import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommunityModerationService } from '../services/community-moderation.service';
import { CreateModerationActionRequest } from '../dto/request/create-moderation-action.request';
import { ListModerationQuery } from '../dto/query/list-moderation.query';

@ApiTags('communities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunityModerationController {
  constructor(private readonly moderationService: CommunityModerationService) {}

  @Get(':slug/moderation')
  async list(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Query() query: ListModerationQuery,
  ) {
    return this.moderationService.list(
      slug,
      userId,
      query.actionType,
      query.cursor,
      query.limit,
    );
  }

  @Post(':slug/moderation')
  async record(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() request: CreateModerationActionRequest,
  ) {
    await this.moderationService.record(slug, userId, request);

    return { recorded: true };
  }
}
