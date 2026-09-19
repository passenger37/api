import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookmarkRepository } from '../repositories/bookmark.repository';
import { BookmarkTargetType } from '../types/bookmark.types';
import {
  CreateBookmarkDto,
  MoveBookmarkDto,
  CreateBookmarkCollectionDto,
  UpdateBookmarkCollectionDto,
} from '../dto/create-bookmark.dto';

@Injectable()
export class BookmarkCommandService {
  constructor(private readonly bookmarkRepo: BookmarkRepository) {}

  async save(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<{ bookmark: any; isNew: boolean }> {
    const existing = await this.bookmarkRepo.findByUserAndTarget(
      userId,
      dto.targetType,
      dto.targetId,
    );

    if (existing) {
      if (dto.collectionId && existing.collectionId !== dto.collectionId) {
        const updated = await this.bookmarkRepo.updateBookmarkCollection(
          existing.id,
          userId,
          dto.collectionId,
        );
        return { bookmark: updated, isNew: false };
      }
      return { bookmark: existing, isNew: false };
    }

    try {
      const bookmark = await this.bookmarkRepo.create({
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        collectionId: dto.collectionId,
      });
      return { bookmark, isNew: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Content already saved');
      }
      throw error;
    }
  }

  async unsave(
    userId: string,
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<void> {
    const bookmark = await this.bookmarkRepo.findByUserAndTarget(
      userId,
      targetType,
      targetId,
    );
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }
    await this.bookmarkRepo.delete(bookmark.id, userId);
  }

  async moveToCollection(
    userId: string,
    bookmarkId: string,
    dto: MoveBookmarkDto,
  ): Promise<any> {
    const bookmark = await this.bookmarkRepo.findById(bookmarkId);
    if (!bookmark || bookmark.userId !== userId) {
      throw new NotFoundException('Bookmark not found');
    }

    if (dto.collectionId) {
      const collection = await this.bookmarkRepo.findCollectionById(
        dto.collectionId,
        userId,
      );
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }
    }

    return this.bookmarkRepo.updateBookmarkCollection(
      bookmarkId,
      userId,
      dto.collectionId ?? null,
    );
  }

  async createCollection(
    userId: string,
    dto: CreateBookmarkCollectionDto,
  ): Promise<any> {
    const existing = await this.bookmarkRepo.findCollectionByName(
      userId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException('Collection with this name already exists');
    }

    return this.bookmarkRepo.createCollection({
      userId,
      name: dto.name,
      description: dto.description,
      isPrivate: dto.isPrivate,
    });
  }

  async updateCollection(
    userId: string,
    collectionId: string,
    dto: UpdateBookmarkCollectionDto,
  ): Promise<any> {
    const collection = await this.bookmarkRepo.findCollectionById(
      collectionId,
      userId,
    );
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (dto.name && dto.name !== collection.name) {
      const existing = await this.bookmarkRepo.findCollectionByName(
        userId,
        dto.name,
      );
      if (existing) {
        throw new ConflictException('Collection with this name already exists');
      }
    }

    return this.bookmarkRepo.updateCollection(collectionId, userId, {
      name: dto.name,
      description: dto.description,
      isPrivate: dto.isPrivate,
    });
  }

  async deleteCollection(userId: string, collectionId: string): Promise<void> {
    const collection = await this.bookmarkRepo.findCollectionById(
      collectionId,
      userId,
    );
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.bookmarkRepo.deleteCollection(collectionId, userId);
  }
}
