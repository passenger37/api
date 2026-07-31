import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Permission } from '@prisma/client';

import { PermissionsRepository } from '../repositories';

@Injectable()
export class PermissionValidationService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  /**
   * Ensure permission exists.
   */
  async validatePermissionExists(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return permission;
  }

  /**
   * Ensure permission name is unique.
   */
  async validateUniqueName(name: string, ignoreId?: string): Promise<void> {
    const existing = await this.permissionsRepository.findByName(name);

    if (existing && existing.id !== ignoreId) {
      throw new BadRequestException('Permission name already exists.');
    }
  }

  /**
   * Prevent editing system permissions.
   */
  validateCanUpdate(permission: Permission): void {
    if (permission.isSystem) {
      throw new BadRequestException('System permissions cannot be modified.');
    }
  }

  /**
   * Prevent deleting system permissions.
   */
  validateCanDelete(permission: Permission): void {
    if (permission.isSystem) {
      throw new BadRequestException('System permissions cannot be deleted.');
    }
  }
}
