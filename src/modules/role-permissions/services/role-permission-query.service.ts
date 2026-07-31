import { Injectable, NotFoundException } from '@nestjs/common';

import { RolePermissionMapper } from '../mappers';
import { RolePermissionsRepository } from '../repositories';

@Injectable()
export class RolePermissionQueryService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  /**
   * Get assignment by ID
   */
  async findById(id: string) {
    const assignment = await this.repository.findById(id);

    if (!assignment) {
      throw new NotFoundException('Role permission assignment not found.');
    }

    return RolePermissionMapper.toResponse(assignment);
  }

  /**
   * Get all permissions assigned to a role
   */
  async getPermissionsByRole(roleId: string) {
    const assignments = await this.repository.findPermissionsByRole(roleId);

    return assignments.map((item) => item.permission);
  }

  /**
   * Get all roles assigned to a permission
   */
  async getRolesByPermission(permissionId: string) {
    const assignments =
      await this.repository.findRolesByPermission(permissionId);

    return assignments.map((item) => item.role);
  }
}
