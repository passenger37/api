import { Injectable } from '@nestjs/common';
import { CommunityModeratorRole, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { CommunitySlugService } from './community-slug.service';
import { CommunityAccessService } from './community-access.service';
import {
  CommunityAccessDeniedException,
  CommunityCategoryConflictException,
  CommunityCategoryNotFoundException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunityModeratorRepository } from '../repositories/community-moderator.repository';
import { ServerMemberRepository } from '../../servers/repositories/server-member.repository';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { ServerPermission } from '@prisma/client';
import { CreateCommunityRequest } from '../dto/request/create-community.request';
import { UpdateCommunityRequest } from '../dto/request/update-community.request';
import { CreateCategoryRequest } from '../dto/request/create-category.request';
import { UpdateCategoryRequest } from '../dto/request/update-category.request';
import { CategoryResponse, CommunityResponse } from '../dto/response';
import { CommunityWithCounts } from '../types/community.types';
import { serializeCategory, serializeCommunity } from '../mappers/community.mapper';
import { CommunityEventPublisher } from '../events/community-event-publisher';
import { COMMUNITY_REALTIME_EVENTS } from '../realtime/community-realtime.constants';

@Injectable()
export class CommunityCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: CommunitySlugService,
    private readonly repository: CommunityRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly moderatorRepository: CommunityModeratorRepository,
    private readonly serverMemberRepository: ServerMemberRepository,
    private readonly serverPermissionService: ServerPermissionService,
    private readonly access: CommunityAccessService,
    private readonly eventPublisher: CommunityEventPublisher,
  ) {}

  async create(
    ownerId: string,
    request: CreateCommunityRequest,
  ): Promise<CommunityResponse> {
    // Authz: the caller must be an active member of the underlying server
    // and hold SERVER_UPDATE. The doc's "Server permissions remain
    // authoritative" rule means we don't introduce a Community-specific
    // permission yet — SERVER_UPDATE is the right floor (it already implies
    // SERVER_VIEW via the permission resolver). A non-member gets the
    // generic 403; a member without SERVER_UPDATE gets the same 403 so we
    // don't leak the existence of the server.
    const membership = await this.serverMemberRepository.findByServerAndUser(
      request.serverId,
      ownerId,
    );

    if (!membership) {
      throw new CommunityAccessDeniedException(
        'You must be a member of the server to create a community on it.',
      );
    }

    const allowed = await this.serverPermissionService.hasPermission(
      request.serverId,
      ownerId,
      ServerPermission.SERVER_UPDATE,
    );

    if (!allowed) {
      throw new CommunityAccessDeniedException(
        'You do not have permission to create a community on this server.',
      );
    }

    const slug = await this.slugService.generate(request.name);

    const community = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CommunityCreateInput = {
        serverId: request.serverId,
        ownerId,
        name: request.name,
        slug,
        description: request.description ?? null,
        discoveryEnabled: request.discoveryEnabled ?? true,
        ...(request.visibility !== undefined
          ? { visibility: request.visibility }
          : {}),
        ...(request.rules !== undefined
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

    // Invalidate any cached server permissions for the new owner — the
    // owner is now a community admin, but more importantly the membership
    // lookup we just did is also serving as a side effect for any future
    // permission cache miss.
    this.serverPermissionService.clearUserCache(
      request.serverId,
      ownerId,
    );

    const withCounts = (await this.repository.findById(community.id))!;

    const response = serializeCommunity(withCounts);

    // Realtime: the new community becomes visible to subscribers of the
    // server's community listing. We publish on the community's own channel
    // so the future gateway can fan out to the owner + moderators. The
    // audience doesn't include the creator (they don't need an echo), but
    // a future "community:created" event is not in scope of this PR.
    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'created',
      community: response,
    });

    return response;
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

    const response = serializeCommunity(withCounts);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'updated',
      community: response,
    });

    return response;
  }

  async softDelete(slug: string, userId: string): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertOwner(community.id, userId);

    await this.repository.hideFromDiscovery(community.id);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'soft-deleted',
      communityId: community.id,
    });
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

    const response = serializeCategory(category);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'category-created',
      communityId: community.id,
      category: response,
    });

    return response;
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

    const response = serializeCategory(updated);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'category-updated',
      communityId: community.id,
      category: response,
    });

    return response;
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

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'category-deleted',
      communityId: community.id,
      categoryId,
    });
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

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'moderator-added',
      communityId: community.id,
      targetUserId,
      role,
    });
  }

  async removeModerator(
    slug: string,
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertAdmin(community.id, userId);

    await this.moderatorRepository.remove(community.id, targetUserId);

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.SUBSCRIPTION_CHANGED, {
      action: 'moderator-removed',
      communityId: community.id,
      targetUserId,
    });
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
