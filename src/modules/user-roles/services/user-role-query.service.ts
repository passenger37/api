import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRoleMapper } from '../mappper/user-role.mapper';
import { UserRolesRepository } from '../repositories';

@Injectable()
export class UserRoleQueryService {
  constructor(
    private readonly repository: UserRolesRepository,
    private readonly mapper: UserRoleMapper,
  ) {}

  // =====================================================
  // Find By Id
  // =====================================================

  async findById(id: string) {
    const entity = await this.repository.findById(id);

    if (!entity) {
      throw new NotFoundException('User role assignment not found.');
    }

    return this.mapper.toBasic(entity);
  }

  // =====================================================
  // Roles Of User
  // =====================================================

  async getRolesByUser(userId: string) {
    const entities = await this.repository.findRolesByUser(userId);

    return this.mapper.toWithRoleList(entities);
  }

  // =====================================================
  // Users Of Role
  // =====================================================

  async getUsersByRole(roleId: string) {
    const entities = await this.repository.findUsersByRole(roleId);

    return this.mapper.toWithUserList(entities);
  }
}
