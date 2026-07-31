import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PermissionsRepository } from '../../permissions/repositories';
import { RolePermissionsRepository } from '../repositories';
import { RolesRepository } from '../../roles/repositories/roles.repository';

@Injectable()
export class RolePermissionValidationService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  async validateAssign(roleId: string, permissionId: string): Promise<void> {
    const role = await this.rolesRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    const permission = await this.permissionsRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    const existing =
      await this.rolePermissionsRepository.findByRoleAndPermission(
        roleId,
        permissionId,
      );

    if (existing) {
      throw new BadRequestException('Permission already assigned to role.');
    }
  }

  async validateRemove(roleId: string, permissionId: string): Promise<void> {
    const assignment =
      await this.rolePermissionsRepository.findByRoleAndPermission(
        roleId,
        permissionId,
      );

    if (!assignment) {
      throw new NotFoundException('Role permission assignment not found.');
    }
  }
}
