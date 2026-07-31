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

  /**
   * Replace permissions
   *
   * (Temporary implementation)
   */
  async replace(dto: ReplaceRolePermissionsDto): Promise<void> {
    /**
     * We will implement synchronization
     * in a later lecture.
     */
  }
}
