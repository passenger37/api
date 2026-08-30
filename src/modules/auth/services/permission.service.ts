import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionMapper } from '../mappers';
import {
  AssignedRolePermissionResponse,
  PermissionResponse,
} from '../responses';

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async findAll(): Promise<PermissionResponse[]> {
    const permissions = await this.permissionRepository.findAll();

    return PermissionMapper.toResponseList(permissions);
  }

  async findById(id: string): Promise<PermissionResponse> {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return PermissionMapper.toResponse(permission);
  }

  async findByName(name: string): Promise<PermissionResponse | null> {
    const permission = await this.permissionRepository.findByName(name);

    return permission ? PermissionMapper.toResponse(permission) : null;
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<AssignedRolePermissionResponse> {
    const existing = await this.permissionRepository.findRolePermission(
      roleId,
      permissionId,
    );

    if (existing) {
      throw new ConflictException('Permission already assigned to role');
    }

    const assignment = await this.permissionRepository.createRolePermission(
      roleId,
      permissionId,
    );

    return PermissionMapper.toAssignedRolePermission(assignment);
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<{ removed: boolean }> {
    const result = await this.permissionRepository.removeRolePermission(
      roleId,
      permissionId,
    );

    return {
      removed: result.count > 0,
    };
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const count = await this.permissionRepository.countUsersWithPermission(
      userId,
      permission,
    );

    return count > 0;
  }
}
