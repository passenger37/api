import { Bookmark, BookmarkCollection } from '@prisma/client';
import {
  BookmarkWithCollection,
  BookmarkCollectionWithItems,
} from '../types/bookmark.types';

export function mapBookmarkToResponse(
  bookmark: Bookmark & {
    collection?: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  },
): BookmarkWithCollection {
  return {
    id: bookmark.id,
    userId: bookmark.userId,
    targetType: bookmark.targetType,
    targetId: bookmark.targetId,
    collectionId: bookmark.collectionId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
    collection: bookmark.collection
      ? {
          id: bookmark.collection.id,
          name: bookmark.collection.name,
          description: bookmark.collection.description,
        }
      : null,
  };
}

export function mapCollectionToResponse(
  collection: BookmarkCollection & { _count?: { bookmarks: number } },
): BookmarkCollectionWithItems {
  return {
    id: collection.id,
    userId: collection.userId,
    name: collection.name,
    description: collection.description,
    isPrivate: collection.isPrivate,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    _count: collection._count,
  };
}
