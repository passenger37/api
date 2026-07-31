import { Injectable } from '@nestjs/common';

import { Role } from '@prisma/client';

import { CreateRoleDto, UpdateRoleDto } from '../dto';

import { RoleFactory } from '../factories';

import { RolesRepository } from '../repositories/roles.repository';

import { RoleValidationService } from './role-validation.service';

@Injectable()
export class RoleDomainService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly roleValidationService: RoleValidationService,
    private readonly roleFactory: RoleFactory,
  ) {}

  // =====================================================
  // Create
  // =====================================================

  async create(dto: CreateRoleDto): Promise<Role> {
    await this.roleValidationService.validateUniqueRoleName(dto.name);

    const input = this.roleFactory.create(dto);

    return this.rolesRepository.create(input);
  }

  // =====================================================
  // Update
  // =====================================================

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    await this.roleValidationService.validateRoleExists(id);

    if (dto.name) {
      const existing = await this.rolesRepository.findByName(dto.name);

      if (existing && existing.id !== id) {
        await this.roleValidationService.validateUniqueRoleName(dto.name);
      }
    }

    const updateData = this.roleFactory.update(dto);

    return this.rolesRepository.update(id, updateData);
  }

  // =====================================================
  // Delete
  // =====================================================

  async delete(id: string): Promise<Role> {
    await this.roleValidationService.validateRoleExists(id);

    return this.rolesRepository.delete(id);
  }
}
