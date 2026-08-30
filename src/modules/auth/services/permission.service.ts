import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PermissionRepository } from '../repositories/permission.repository';

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async findAll() {
    return this.permissionRepository.findAll();
  }

  async findById(id: string) {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async findByName(name: string) {
    return this.permissionRepository.findByName(name);
  }

  async assignPermissionToRole(roleId: string, permissionId: string) {
    const existing = await this.permissionRepository.findRolePermission(
      roleId,
      permissionId,
    );

    if (existing) {
      throw new ConflictException('Permission already assigned to role');
    }

    return this.permissionRepository.createRolePermission(roleId, permissionId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    return this.permissionRepository.removeRolePermission(roleId, permissionId);
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const count = await this.permissionRepository.countUsersWithPermission(
      userId,
      permission,
    );

    return count > 0;
  }
}
