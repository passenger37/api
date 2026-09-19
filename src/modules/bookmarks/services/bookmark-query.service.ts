import { Injectable, NotFoundException } from '@nestjs/common';
import { BookmarkRepository } from '../repositories/bookmark.repository';
import { BookmarkTargetType } from '../types/bookmark.types';
import {
  ListBookmarksDto,
  BatchBookmarkStatusDto,
} from '../dto/create-bookmark.dto';
import {
  PaginatedBookmarks,
  PaginatedCollections,
  BookmarkStatus,
} from '../types/bookmark.types';

@Injectable()
export class BookmarkQueryService {
  constructor(private readonly bookmarkRepo: BookmarkRepository) {}

  async getSavedItems(
    userId: string,
    dto: ListBookmarksDto,
  ): Promise<PaginatedBookmarks> {
    return this.bookmarkRepo.findManyByUser(userId, {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
      targetType: dto.targetType,
      collectionId: dto.collectionId,
    });
  }

  async getCollections(
    userId: string,
    dto: ListBookmarksDto,
  ): Promise<PaginatedCollections> {
    return this.bookmarkRepo.findCollectionsByUser(userId, {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
    });
  }

  async getCollectionById(userId: string, collectionId: string) {
    const collection = await this.bookmarkRepo.findCollectionById(
      collectionId,
      userId,
    );
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    return collection;
  }

  async getBookmarkStatus(
    userId: string,
    dto: BatchBookmarkStatusDto,
  ): Promise<Record<string, BookmarkStatus>> {
    const statusMap = await this.bookmarkRepo.getBookmarkStatus(
      userId,
      dto.targetType,
      dto.targetIds,
    );

    const result: Record<string, BookmarkStatus> = {};
    for (const targetId of dto.targetIds) {
      const status = statusMap.get(targetId) ?? {
        saved: false,
        collectionId: null,
      };
      result[targetId] = {
        targetType: dto.targetType,
        targetId,
        saved: status.saved,
        collectionId: status.collectionId,
      };
    }

    return result;
  }

  async getSingleBookmarkStatus(
    userId: string,
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<BookmarkStatus> {
    const statusMap = await this.bookmarkRepo.getBookmarkStatus(
      userId,
      targetType,
      [targetId],
    );
    const status = statusMap.get(targetId) ?? {
      saved: false,
      collectionId: null,
    };

    return {
      targetType,
      targetId,
      saved: status.saved,
      collectionId: status.collectionId,
    };
  }

  async getTotalSavedCount(userId: string): Promise<number> {
    return this.bookmarkRepo.countByUser(userId);
  }
}
