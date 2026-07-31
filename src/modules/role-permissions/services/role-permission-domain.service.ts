import { Injectable } from '@nestjs/common';

import { RolePermission } from '@prisma/client';

import {
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionFactory } from '../factories';
import { RolePermissionsRepository } from '../repositories';

@Injectable()
export class RolePermissionDomainService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  /**
   * Assign one permission
   */
  async assign(dto: AssignPermissionToRoleDto): Promise<RolePermission> {
    const data = RolePermissionFactory.create(dto);

    return this.repository.create(data);
  }

  /**
   * Remove one permission
   */
  async remove(roleId: string, permissionId: string): Promise<RolePermission> {
    const assignment = await this.repository.findByRoleAndPermission(
      roleId,
      permissionId,
    );

    return this.repository.delete(assignment!.id);
  }

  /**
   * Assign multiple permissions
   */
  async assignMany(dto: AssignPermissionsToRoleDto): Promise<void> {
    for (const permissionId of dto.permissionIds) {
      const data = RolePermissionFactory.create({
        roleId: dto.roleId,
        permissionId,
      });

      await this.repository.create(data);
    }
  }

  async replace(dto: ReplaceRolePermissionsDto): Promise<void> {
    // Current assignments
    const current = await this.repository.findByRoleId(dto.roleId);

    // Existing permission ids
    const currentPermissionIds = new Set(
      current.map((item) => item.permissionId),
    );

    // Incoming permission ids
    const incomingPermissionIds = new Set(dto.permissionIds);

    // ----------------------------------------
    // Calculate permissions to remove
    // ----------------------------------------

    const assignmentsToRemove = current.filter(
      (assignment) => !incomingPermissionIds.has(assignment.permissionId),
    );

    // ----------------------------------------
    // Calculate permissions to add
    // ----------------------------------------

    const permissionsToAdd = dto.permissionIds.filter(
      (permissionId) => !currentPermissionIds.has(permissionId),
    );

    // ----------------------------------------
    // Delete
    // ----------------------------------------

    if (assignmentsToRemove.length > 0) {
      await this.repository.deleteMany(
        assignmentsToRemove.map((item) => item.id),
      );
    }

    // ----------------------------------------
    // Create
    // ----------------------------------------

    if (permissionsToAdd.length > 0) {
      await this.repository.createMany(dto.roleId, permissionsToAdd);
    }
  }
}
