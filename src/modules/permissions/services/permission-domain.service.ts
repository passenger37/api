import { Injectable } from '@nestjs/common';

import { Permission } from '@prisma/client';

import { CreatePermissionDto, UpdatePermissionDto } from '../dto';

import { PermissionFactory } from '../factories';

import { PermissionsRepository } from '../repositories';

import { PermissionValidationService } from './permission-validation.service';

@Injectable()
export class PermissionDomainService {
  constructor(
    private readonly repository: PermissionsRepository,

    private readonly validation: PermissionValidationService,

    private readonly factory: PermissionFactory,
  ) {}

  /**
   * Create Permission
   */
  async create(dto: CreatePermissionDto): Promise<Permission> {
    await this.validation.validateUniqueName(dto.name);

    const data = this.factory.create(dto);

    return this.repository.create(data);
  }

  /**
   * Update Permission
   */
  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.validation.validatePermissionExists(id);

    this.validation.validateCanUpdate(permission);

    if (dto.name && dto.name !== permission.name) {
      await this.validation.validateUniqueName(dto.name, permission.id);
    }

    const data = this.factory.update(dto);

    return this.repository.update(id, data);
  }

  /**
   * Delete Permission
   */
  async delete(id: string): Promise<void> {
    const permission = await this.validation.validatePermissionExists(id);

    this.validation.validateCanDelete(permission);

    await this.repository.delete(id);
  }
}
