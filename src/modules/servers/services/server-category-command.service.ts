import { Injectable } from '@nestjs/common';

import { Prisma, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerCategoryRepository } from '../repositories/server-category.repository';

import { ServerCategoryValidationService } from './server-category-validation.service';

import { ServerPermissionService } from './server-permission.service';

import { CreateServerCategoryRequest } from '../dto/request/create-server-category.request';
import { UpdateServerCategoryRequest } from '../dto/request/update-server-category.request';
import { ReorderServerCategoriesRequest } from '../dto/request/reorder-server-categories.request';

@Injectable()
export class ServerCategoryCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly repository: ServerCategoryRepository,

    private readonly validation: ServerCategoryValidationService,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async createCategory(
    serverId: string,
    userId: string,
    request: CreateServerCategoryRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CATEGORY_CREATE,
    );

    this.validation.validateReservedName(request.name);

    await this.validation.validateUniqueName(serverId, request.name);

    await this.validation.validateCategoryLimit(serverId);

    const highestPosition = await this.repository.getHighestPosition(serverId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.create(
        {
          name: request.name,

          position: highestPosition + 1,

          server: {
            connect: {
              id: serverId,
            },
          },
        },
        tx,
      );
    });
  }

  async updateCategory(
    serverId: string,
    categoryId: string,
    userId: string,
    request: UpdateServerCategoryRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CATEGORY_UPDATE,
    );

    await this.validation.validateCategoryExists(categoryId);

    if (request.name) {
      this.validation.validateReservedName(request.name);

      await this.validation.validateUniqueName(serverId, request.name);
    }

    return this.prisma.$transaction(async (tx) => {
      return this.repository.update(
        categoryId,
        {
          ...(request.name && {
            name: request.name,
          }),
        },
        tx,
      );
    });
  }

  async deleteCategory(serverId: string, categoryId: string, userId: string) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CATEGORY_DELETE,
    );

    await this.validation.validateCategoryExists(categoryId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.delete(categoryId, tx);
    });
  }

  async reorderCategories(
    serverId: string,
    userId: string,
    request: ReorderServerCategoriesRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CATEGORY_UPDATE,
    );

    return this.prisma.$transaction(async (tx) => {
      await Promise.all(
        request.categories.map((category) =>
          this.repository.update(
            category.categoryId,
            {
              position: category.position,
            },
            tx,
          ),
        ),
      );
    });
  }
}
