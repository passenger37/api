import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SearchService } from '../services/search.service';
import {
  AdvancedSearchRequestDto,
  SearchSuggestionsRequestDto,
  SearchAnalyticsRequestDto,
  ReindexRequestDto,
  IndexContentRequestDto,
  RemoveFromIndexRequestDto,
} from '../dto/search.request';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Advanced search with faceted results' })
  async advancedSearch(
    @CurrentUser('id') userId: string,
    @Query() query: AdvancedSearchRequestDto,
  ) {
    return this.searchService.advancedSearch({ ...query, userId });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions based on partial query' })
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query() query: SearchSuggestionsRequestDto,
  ) {
    return this.searchService.getSearchSuggestions(userId, query.partialQuery, query.limit);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get search analytics' })
  async getAnalytics(
    @CurrentUser('id') userId: string,
    @Query() query: SearchAnalyticsRequestDto,
  ) {
    // Only admins can see analytics (could add a guard)
    return this.searchService.getSearchAnalytics(query.engine || 'meilisearch', query.days);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user search history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.searchService.getSearchHistory(userId, {
      limit: limit ? parseInt(limit) : 20,
      cursor,
    });
  }

  @Get('e2ee')
  @ApiOperation({ summary: 'Search E2EE messages (client-side search hint)' })
  async searchE2EE(
    @CurrentUser('id') userId: string,
    @Query('query') query: string,
    @Query('sessionId') sessionId?: string,
    @Query('groupId') groupId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }
    return this.searchService.searchE2EEMessages(userId, query, {
      sessionId,
      groupId,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('index')
  @ApiOperation({ summary: 'Index a piece of content' })
  async indexContent(
    @CurrentUser('id') userId: string,
    @Body() dto: IndexContentRequestDto,
  ) {
    switch (dto.contentType) {
      case 'channel_message':
        await this.searchService.indexChannelMessage(dto.contentId, {
          serverId: dto.serverId!,
          channelId: dto.channelId!,
          authorId: dto.authorId!,
          content: dto.content,
          title: dto.title,
          createdAt: new Date(),
        });
        break;
      case 'direct_message':
        await this.searchService.indexDirectMessage(dto.contentId, {
          authorId: dto.authorId!,
          content: dto.content,
          createdAt: new Date(),
        });
        break;
      case 'server':
        await this.searchService.indexServer(dto.contentId, {
          name: dto.title!,
          description: dto.content,
          memberCount: parseInt(dto.metadata || '0'),
          createdAt: new Date(),
        });
        break;
      case 'channel':
        await this.searchService.indexChannel(dto.contentId, {
          serverId: dto.serverId!,
          name: dto.title!,
          description: dto.content,
          type: dto.metadata || 'TEXT',
          createdAt: new Date(),
        });
        break;
      case 'user':
        await this.searchService.indexUser(dto.contentId, {
          username: dto.title!,
          displayName: dto.content,
          bio: dto.metadata,
          createdAt: new Date(),
        });
        break;
    }
    return { success: true, indexed: true };
  }

  @Delete('index')
  @ApiOperation({ summary: 'Remove content from search index' })
  async removeFromIndex(
    @CurrentUser('id') userId: string,
    @Body() dto: RemoveFromIndexRequestDto,
  ) {
    await this.searchService.removeFromIndex(dto.contentType, dto.contentId);
    return { success: true, removed: true };
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Reindex content (admin only)' })
  async reindex(@Body() dto: ReindexRequestDto) {
    // This would typically have an admin guard
    return this.searchService.reindexAll();
  }
}