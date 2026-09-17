import { Injectable } from '@nestjs/common';
import { BookmarkRepository } from '../repositories/bookmark.repository';
import { PaginatedCollections, BookmarkCollectionWithItems } from '../types/bookmark.types';
import { ListBookmarksDto } from '../dto/create-bookmark.dto';

@Injectable()
export class BookmarkCollectionService {
  constructor(private readonly bookmarkRepo: BookmarkRepository) {}

  async getCollections(userId: string, dto: ListBookmarksDto): Promise<PaginatedCollections> {
    return this.bookmarkRepo.findCollectionsByUser(userId, {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
    });
  }

  async getCollectionWithItems(
    userId: string,
    collectionId: string,
    options: { limit: number; cursor?: string },
  ): Promise<(BookmarkCollectionWithItems & { items: any[]; nextCursor: string | null; hasMore: boolean }) | null> {
    const collection = await this.bookmarkRepo.findCollectionById(collectionId, userId);
    if (!collection) {
      return null;
    }

    const bookmarks = await this.bookmarkRepo.findManyByUser(userId, {
      limit: options.limit + 1,
      cursor: options.cursor,
      collectionId,
    });

    return {
      ...collection,
      items: bookmarks.items,
      nextCursor: bookmarks.nextCursor,
      hasMore: bookmarks.hasMore,
    };
  }
}