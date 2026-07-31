import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RoleValidationService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  // =====================================================
  // Validate Unique Role Name
  // =====================================================

  async validateUniqueRoleName(name: string): Promise<void> {
    const exists = await this.rolesRepository.findByName(name);

    if (exists) {
      throw new ConflictException('Role name already exists.');
    }
  }

  // =====================================================
  // Validate Role Exists
  // =====================================================

  async validateRoleExists(id: string): Promise<Role> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }
}
