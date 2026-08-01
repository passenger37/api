import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RolesRepository } from '../../roles/repositories/roles.repository';
import { PermissionsRepository } from '../../permissions/repositories/permissions.repository';
import { AuthorizationRepository } from '../repositories/authorization.repository';

@Injectable()
export class AuthorizationValidationService {
  constructor(
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  // =====================================================
  // Role Exists
  // =====================================================

  async validateRoleExists(roleId: string): Promise<void> {
    const role = await this.rolesRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }
  }

  // =====================================================
  // Permission Exists
  // =====================================================

  async validatePermissionExists(permissionId: string): Promise<void> {
    const permission = await this.permissionsRepository.findById(permissionId);

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }
  }

  // =====================================================
  // Assignment Does Not Exist
  // =====================================================

  async validateRolePermissionDoesNotExist(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const role = await this.authorizationRepository.findRolePermissions(roleId);

    const exists =
      role?.permissions.some((rp) => rp.permissionId === permissionId) ?? false;

    if (exists) {
      throw new ConflictException('Permission already assigned to role.');
    }
  }

  // =====================================================
  // Assignment Exists
  // =====================================================

  async validateRolePermissionExists(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const role = await this.authorizationRepository.findRolePermissions(roleId);

    const exists =
      role?.permissions.some((rp) => rp.permissionId === permissionId) ?? false;

    if (!exists) {
      throw new NotFoundException('Role permission assignment not found.');
    }
  }

  // =====================================================
  // Validate Assignment
  // =====================================================

  async validateAssignment(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.validateRoleExists(roleId);

    await this.validatePermissionExists(permissionId);

    await this.validateRolePermissionDoesNotExist(roleId, permissionId);
  }

  // =====================================================
  // Validate Assignments
  // =====================================================

  async validateAssignments(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.validateAssignment(roleId, permissionId);
    }
  }

  // =====================================================
  // Validate Existing Assignments
  // =====================================================

  async validateExistingAssignments(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.validateRolePermissionExists(roleId, permissionId);
    }
  }

  // =====================================================
  // Validate One Permission Assignment
  // =====================================================

  async validatePermissionAssignment(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.validateAssignment(roleId, permissionId);
  }

  // =====================================================
  // Validate Multiple Permission Assignments
  // =====================================================

  async validatePermissionAssignments(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.validateAssignments(roleId, permissionIds);
  }

  // =====================================================
  // Validate Assignment Exists
  // =====================================================

  async validatePermissionAssignmentExists(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.validateRolePermissionExists(roleId, permissionId);
  }

  // =====================================================
  // Validate Multiple Permissions Exist
  // =====================================================

  async validatePermissionsExist(permissionIds: string[]): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.validatePermissionExists(permissionId);
    }
  }
}
