import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ServerCategoryRepository } from '../repositories/server-category.repository';

@Injectable()
export class ServerCategoryValidationService {
  private static readonly RESERVED_NAMES = ['system', 'default', 'everyone'];

  private static readonly MAX_CATEGORIES = 50;

  constructor(private readonly repository: ServerCategoryRepository) {}

  async validateCategoryExists(categoryId: string) {
    const category = await this.repository.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async validateUniqueName(serverId: string, name: string) {
    const existing = await this.repository.findByName(serverId, name);

    if (existing) {
      throw new ConflictException('Category name already exists.');
    }
  }

  async validateCategoryLimit(serverId: string) {
    const total = await this.repository.count(serverId);

    if (total >= ServerCategoryValidationService.MAX_CATEGORIES) {
      throw new BadRequestException('Maximum category limit reached.');
    }
  }

  validateReservedName(name: string) {
    if (
      ServerCategoryValidationService.RESERVED_NAMES.includes(
        name.toLowerCase(),
      )
    ) {
      throw new BadRequestException('Reserved category name.');
    }
  }

  validatePosition(position: number) {
    if (position < 0) {
      throw new BadRequestException('Invalid category position.');
    }
  }
}
