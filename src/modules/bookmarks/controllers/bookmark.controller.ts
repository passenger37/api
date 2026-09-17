import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { BookmarkCommandService } from '../services/bookmark-command.service';
import { BookmarkQueryService } from '../services/bookmark-query.service';
import { BookmarkCollectionService } from '../services/bookmark-collection.service';
import {
  CreateBookmarkDto,
  ListBookmarksDto,
  MoveBookmarkDto,
  CreateBookmarkCollectionDto,
  UpdateBookmarkCollectionDto,
  BatchBookmarkStatusDto,
} from '../dto/create-bookmark.dto';
import { BookmarkTargetType } from '../types/bookmark.types';
import { mapBookmarkToResponse, mapCollectionToResponse } from '../mappers/bookmark.mapper';

@ApiTags('Bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarkController {
  constructor(
    private readonly commandService: BookmarkCommandService,
    private readonly queryService: BookmarkQueryService,
    private readonly collectionService: BookmarkCollectionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Save content (bookmark)' })
  @ApiResponse({ status: 201, description: 'Content saved' })
  @ApiResponse({ status: 409, description: 'Already saved' })
  async save(@CurrentUser() user: User, @Body() dto: CreateBookmarkDto) {
    const result = await this.commandService.save(user.id, dto);
    return {
      success: true,
      data: mapBookmarkToResponse(result.bookmark),
      isNew: result.isNew,
    };
  }

  @Delete(':targetType/:targetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove bookmark (unsave)' })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async unsave(
    @CurrentUser() user: User,
    @Param('targetType') targetType: BookmarkTargetType,
    @Param('targetId') targetId: string,
  ) {
    await this.commandService.unsave(user.id, targetType, targetId);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated saved items' })
  @ApiResponse({ status: 200, description: 'List of saved items' })
  async list(@CurrentUser() user: User, @Query() dto: ListBookmarksDto) {
    const result = await this.queryService.getSavedItems(user.id, dto);
    return {
      success: true,
      data: {
        items: result.items.map(mapBookmarkToResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get bookmark status for a single target' })
  @ApiResponse({ status: 200, description: 'Bookmark status' })
  async getStatus(
    @CurrentUser() user: User,
    @Query('targetType') targetType: BookmarkTargetType,
    @Query('targetId') targetId: string,
  ) {
    const status = await this.queryService.getSingleBookmarkStatus(user.id, targetType, targetId);
    return { success: true, data: status };
  }

  @Post('status/batch')
  @ApiOperation({ summary: 'Get bookmark status for multiple targets (batch)' })
  @ApiResponse({ status: 200, description: 'Batch bookmark status' })
  async getBatchStatus(@CurrentUser() user: User, @Body() dto: BatchBookmarkStatusDto) {
    const statuses = await this.queryService.getBookmarkStatus(user.id, dto);
    return { success: true, data: statuses };
  }

  @Patch(':bookmarkId/collection')
  @ApiOperation({ summary: 'Move bookmark to collection' })
  @ApiResponse({ status: 200, description: 'Bookmark moved' })
  @ApiResponse({ status: 404, description: 'Bookmark or collection not found' })
  async moveToCollection(
    @CurrentUser() user: User,
    @Param('bookmarkId') bookmarkId: string,
    @Body() dto: MoveBookmarkDto,
  ) {
    const bookmark = await this.commandService.moveToCollection(user.id, bookmarkId, dto);
    return { success: true, data: mapBookmarkToResponse(bookmark) };
  }

  @Post('collections')
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiResponse({ status: 201, description: 'Collection created' })
  @ApiResponse({ status: 409, description: 'Collection name already exists' })
  async createCollection(@CurrentUser() user: User, @Body() dto: CreateBookmarkCollectionDto) {
    const collection = await this.commandService.createCollection(user.id, dto);
    return { success: true, data: mapCollectionToResponse(collection) };
  }

  @Get('collections')
  @ApiOperation({ summary: 'Get paginated collections' })
  @ApiResponse({ status: 200, description: 'List of collections' })
  async listCollections(@CurrentUser() user: User, @Query() dto: ListBookmarksDto) {
    const result = await this.collectionService.getCollections(user.id, dto);
    return {
      success: true,
      data: {
        items: result.items.map(mapCollectionToResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  }

  @Get('collections/:collectionId')
  @ApiOperation({ summary: 'Get collection with items' })
  @ApiResponse({ status: 200, description: 'Collection with items' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getCollection(
    @CurrentUser() user: User,
    @Param('collectionId') collectionId: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.collectionService.getCollectionWithItems(user.id, collectionId, {
      limit: limit + 1,
      cursor,
    });
    if (!result) {
      return { success: false, error: 'Collection not found' };
    }

    const { items, nextCursor, hasMore, ...collection } = result;
    return {
      success: true,
      data: {
        ...mapCollectionToResponse(collection),
        items: items.map(mapBookmarkToResponse),
        nextCursor,
        hasMore,
      },
    };
  }

  @Patch('collections/:collectionId')
  @ApiOperation({ summary: 'Update collection' })
  @ApiResponse({ status: 200, description: 'Collection updated' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 409, description: 'Collection name already exists' })
  async updateCollection(
    @CurrentUser() user: User,
    @Param('collectionId') collectionId: string,
    @Body() dto: UpdateBookmarkCollectionDto,
  ) {
    const collection = await this.commandService.updateCollection(user.id, collectionId, dto);
    return { success: true, data: mapCollectionToResponse(collection) };
  }

  @Delete('collections/:collectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete collection' })
  @ApiResponse({ status: 200, description: 'Collection deleted' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async deleteCollection(
    @CurrentUser() user: User,
    @Param('collectionId') collectionId: string,
  ) {
    await this.commandService.deleteCollection(user.id, collectionId);
    return { success: true };
  }
}