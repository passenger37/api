import { Injectable } from '@nestjs/common';
import { CommunityModeratorRole, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommunitySlugService } from './community-slug.service';
import { CommunityAccessService } from './community-access.service';
import {
  CommunityCategoryConflictException,
  CommunityCategoryNotFoundException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunityModeratorRepository } from '../repositories/community-moderator.repository';
import { CreateCommunityRequest } from '../dto/request/create-community.request';
import { UpdateCommunityRequest } from '../dto/request/update-community.request';
import { CreateCategoryRequest } from '../dto/request/create-category.request';
import { UpdateCategoryRequest } from '../dto/request/update-category.request';
import { CategoryResponse, CommunityResponse } from '../dto/response';
import { CommunityWithCounts } from '../types/community.types';
import { serializeCategory, serializeCommunity } from '../mappers/community.mapper';

@Injectable()
export class CommunityCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: CommunitySlugService,
    private readonly repository: CommunityRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly moderatorRepository: CommunityModeratorRepository,
    private readonly access: CommunityAccessService,
  ) {}

  async create(
    ownerId: string,
    request: CreateCommunityRequest,
  ): Promise<CommunityResponse> {
    const slug = await this.slugService.generate(request.name);

    const community = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CommunityCreateInput = {
        serverId: request.serverId,
        ownerId,
        name: request.name,
        slug,
        description: request.description ?? null,
        discoveryEnabled: request.discoveryEnabled ?? true,
        ...(request.visibility
          ? { visibility: request.visibility }
          : {}),
        ...(request.rules
          ? { rules: request.rules as Prisma.InputJsonValue }
          : {}),
      };

      const created = await this.repository.create(data, tx);

      await this.moderatorRepository.upsert(
        created.id,
        ownerId,
        CommunityModeratorRole.ADMIN,
        tx,
      );

      return created;
    });

    const withCounts = (await this.repository.findById(community.id))!;

    return serializeCommunity(withCounts);
  }

  async update(
    slug: string,
    userId: string,
    request: UpdateCommunityRequest,
  ): Promise<CommunityResponse> {
    const community = await this.communityBySlug(slug);

    await this.access.assertOwner(community.id, userId);

    const data: Prisma.CommunityUpdateInput = {
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.description !== undefined
        ? { description: request.description }
        : {}),
      ...(request.iconUrl !== undefined ? { iconUrl: request.iconUrl } : {}),
      ...(request.visibility !== undefined
        ? { visibility: request.visibility }
        : {}),
      ...(request.discoveryEnabled !== undefined
        ? { discoveryEnabled: request.discoveryEnabled }
        : {}),
      ...(request.rules !== undefined
        ? { rules: request.rules as Prisma.InputJsonValue }
        : {}),
    };

    await this.repository.update(community.id, data);

    const withCounts = (await this.repository.findById(community.id))!;

    return serializeCommunity(withCounts);
  }

  async softDelete(slug: string, userId: string): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertOwner(community.id, userId);

    await this.repository.softDelete(community.id);
  }

  async createCategory(
    slug: string,
    userId: string,
    request: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    const existing = await this.categoryRepository.findByName(
      community.id,
      request.name,
    );

    if (existing) {
      throw new CommunityCategoryConflictException();
    }

    const count = await this.prisma.communityCategory.count({
      where: { communityId: community.id },
    });

    const category = await this.categoryRepository.create({
      community: { connect: { id: community.id } },
      name: request.name,
      description: request.description ?? null,
      position: count,
    });

    return serializeCategory(category);
  }

  async updateCategory(
    slug: string,
    categoryId: string,
    userId: string,
    request: UpdateCategoryRequest,
  ): Promise<CategoryResponse> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    const existing = await this.categoryRepository.findById(categoryId);

    if (!existing || existing.communityId !== community.id) {
      throw new CommunityCategoryNotFoundException();
    }

    if (request.name && request.name !== existing.name) {
      const collision = await this.categoryRepository.findByName(
        community.id,
        request.name,
      );

      if (collision && collision.id !== categoryId) {
        throw new CommunityCategoryConflictException();
      }
    }

    const data: Prisma.CommunityCategoryUpdateInput = {
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.description !== undefined
        ? { description: request.description }
        : {}),
    };

    const updated = await this.categoryRepository.update(categoryId, data);

    return serializeCategory(updated);
  }

  async deleteCategory(
    slug: string,
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    const existing = await this.categoryRepository.findById(categoryId);

    if (!existing || existing.communityId !== community.id) {
      throw new CommunityCategoryNotFoundException();
    }

    await this.categoryRepository.delete(categoryId);
  }

  async addModerator(
    slug: string,
    userId: string,
    targetUserId: string,
    role: CommunityModeratorRole,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertAdmin(community.id, userId);

    await this.moderatorRepository.upsert(community.id, targetUserId, role);
  }

  async removeModerator(
    slug: string,
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertAdmin(community.id, userId);

    await this.moderatorRepository.remove(community.id, targetUserId);
  }

  private async communityBySlug(
    slug: string,
  ): Promise<CommunityWithCounts> {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }
}
