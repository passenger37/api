import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, Bookmark, BookmarkCollection, BookmarkTargetType } from '@prisma/client';
import { PaginatedBookmarks, PaginatedCollections, BookmarkWithCollection, BookmarkCollectionWithItems } from '../types/bookmark.types';

@Injectable()
export class BookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    targetType: BookmarkTargetType;
    targetId: string;
    collectionId?: string;
  }): Promise<Bookmark> {
    return this.prisma.bookmark.create({
      data: {
        userId: data.userId,
        targetType: data.targetType,
        targetId: data.targetId,
        collectionId: data.collectionId,
      },
    });
  }

  async findById(id: string): Promise<BookmarkWithCollection | null> {
    return this.prisma.bookmark.findUnique({
      where: { id },
      include: {
        collection: {
          select: { id: true, name: true, description: true },
        },
      },
    });
  }

  async findByUserAndTarget(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<Bookmark | null> {
    return this.prisma.bookmark.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType,
          targetId,
        },
      },
    });
  }

  async findManyByUser(
    userId: string,
    options: {
      limit: number;
      cursor?: string;
      targetType?: BookmarkTargetType;
      collectionId?: string | null;
    },
  ): Promise<PaginatedBookmarks> {
    const { limit, cursor, targetType, collectionId } = options;

    const where: Prisma.BookmarkWhereInput = {
      userId,
      ...(targetType ? { targetType } : {}),
      ...(collectionId !== undefined ? { collectionId } : {}),
    };

    const bookmarks = await this.prisma.bookmark.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        collection: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    let nextCursor: string | null = null;
    let hasMore = false;

    if (bookmarks.length > limit) {
      const nextItem = bookmarks.pop();
      nextCursor = nextItem!.id;
      hasMore = true;
    }

    return {
      items: bookmarks,
      nextCursor,
      hasMore,
    };
  }

  async findCollectionsByUser(
    userId: string,
    options: { limit: number; cursor?: string },
  ): Promise<PaginatedCollections> {
    const { limit, cursor } = options;

    const collections = await this.prisma.bookmarkCollection.findMany({
      where: { userId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { bookmarks: true } },
      },
    });

    let nextCursor: string | null = null;
    let hasMore = false;

    if (collections.length > limit) {
      const nextItem = collections.pop();
      nextCursor = nextItem!.id;
      hasMore = true;
    }

    return {
      items: collections,
      nextCursor,
      hasMore,
    };
  }

  async findCollectionById(id: string, userId: string): Promise<BookmarkCollectionWithItems | null> {
    return this.prisma.bookmarkCollection.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { bookmarks: true } },
      },
    });
  }

  async findCollectionByName(userId: string, name: string): Promise<BookmarkCollection | null> {
    return this.prisma.bookmarkCollection.findFirst({
      where: { userId, name },
    });
  }

  async createCollection(data: {
    userId: string;
    name: string;
    description?: string;
    isPrivate?: boolean;
  }): Promise<BookmarkCollection> {
    return this.prisma.bookmarkCollection.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate ?? true,
      },
    });
  }

  async updateCollection(
    id: string,
    userId: string,
    data: { name?: string; description?: string | null; isPrivate?: boolean },
  ): Promise<BookmarkCollection | null> {
    return this.prisma.bookmarkCollection.update({
      where: { id, userId },
      data,
    });
  }

  async deleteCollection(id: string, userId: string): Promise<void> {
    await this.prisma.bookmarkCollection.delete({
      where: { id, userId },
    });
  }

  async updateBookmarkCollection(
    bookmarkId: string,
    userId: string,
    collectionId: string | null,
  ): Promise<Bookmark | null> {
    return this.prisma.bookmark.update({
      where: { id: bookmarkId, userId },
      data: { collectionId },
    });
  }

  async delete(bookmarkId: string, userId: string): Promise<void> {
    await this.prisma.bookmark.delete({
      where: { id: bookmarkId, userId },
    });
  }

  async getBookmarkStatus(
    userId: string,
    targetType: BookmarkTargetType,
    targetIds: string[],
  ): Promise<Map<string, { saved: boolean; collectionId: string | null }>> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: {
        userId,
        targetType,
        targetId: { in: targetIds },
      },
      select: { targetId: true, collectionId: true },
    });

    const statusMap = new Map<string, { saved: boolean; collectionId: string | null }>();
    for (const targetId of targetIds) {
      statusMap.set(targetId, { saved: false, collectionId: null });
    }

    for (const bookmark of bookmarks) {
      statusMap.set(bookmark.targetId, { saved: true, collectionId: bookmark.collectionId });
    }

    return statusMap;
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.bookmark.count({ where: { userId } });
  }

  async countByCollection(collectionId: string): Promise<number> {
    return this.prisma.bookmark.count({ where: { collectionId } });
  }
}