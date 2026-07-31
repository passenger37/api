import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { UsersRepository } from '../../users/repositories';
import { RolesRepository } from '../../roles/repositories/roles.repository';
import { UserRolesRepository } from '../repositories';

@Injectable()
export class UserRoleValidationService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly userRolesRepository: UserRolesRepository,
  ) {}

  // =====================================================
  // User Exists
  // =====================================================

  async validateUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

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
  // Multiple Roles Exist
  // =====================================================

  async validateRolesExist(roleIds: string[]): Promise<void> {
    for (const roleId of roleIds) {
      await this.validateRoleExists(roleId);
    }
  }

  // =====================================================
  // Assignment Does NOT Exist
  // =====================================================

  async validateAssignmentDoesNotExist(
    userId: string,
    roleId: string,
  ): Promise<void> {
    await this.validateUserExists(userId);
    await this.validateRoleExists(roleId);

    const assignment = await this.userRolesRepository.findByUserAndRole(
      userId,
      roleId,
    );

    if (assignment) {
      throw new ConflictException('Role already assigned to user.');
    }
  }

  // =====================================================
  // Assignment Exists
  // =====================================================

  async validateAssignmentExists(
    userId: string,
    roleId: string,
  ): Promise<void> {
    const assignment = await this.userRolesRepository.findByUserAndRole(
      userId,
      roleId,
    );

    if (!assignment) {
      throw new NotFoundException('User role assignment not found.');
    }
  }

  // =====================================================
  // Validate Multiple Assignments Do NOT Exist
  // =====================================================

  async validateAssignments(userId: string, roleIds: string[]): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    await this.validateUserExists(userId);
    await this.validateRolesExist(roleIds);

    for (const roleId of roleIds) {
      await this.validateAssignmentDoesNotExist(userId, roleId);
    }
  }

  // =====================================================
  // Validate Multiple Assignments Exist
  // =====================================================

  async validateAssignmentsExist(
    userId: string,
    roleIds: string[],
  ): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    for (const roleId of roleIds) {
      await this.validateAssignmentExists(userId, roleId);
    }
  }
}
