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
    const current = await this.repository.findByRoleId(dto.roleId);

    const currentPermissionIds = new Set(current.map((x) => x.permissionId));

    const incomingPermissionIds = new Set(dto.permissionIds);

    const assignmentsToRemove = current.filter(
      (assignment) => !incomingPermissionIds.has(assignment.permissionId),
    );

    const permissionsToAdd = dto.permissionIds.filter(
      (permissionId) => !currentPermissionIds.has(permissionId),
    );

    await this.repository.syncPermissions(
      dto.roleId,

      assignmentsToRemove.map((x) => x.id),

      permissionsToAdd,
    );
  }
}
