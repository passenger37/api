import { BookmarkTargetType } from '@prisma/client';

export { BookmarkTargetType };

export interface BookmarkWithCollection {
  id: string;
  userId: string;
  targetType: BookmarkTargetType;
  targetId: string;
  collectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  collection?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export interface BookmarkCollectionWithItems {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    bookmarks: number;
  };
}

export interface PaginatedBookmarks {
  items: BookmarkWithCollection[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedCollections {
  items: BookmarkCollectionWithItems[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BookmarkStatus {
  targetType: BookmarkTargetType;
  targetId: string;
  saved: boolean;
  collectionId: string | null;
}

export interface BatchBookmarkStatusRequest {
  targetType: BookmarkTargetType;
  targetIds: string[];
}
