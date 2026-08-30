import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateRoleDto, UpdateRoleDto } from '../dto';
import { SystemRoles } from '../../../common/constants/system-roles';
import { PermissionService } from './permission.service';
import { AuthorizationService } from '../../authorization/services/authorization.service';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionService: PermissionService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll() {
    return this.roleRepository.findAll();
  }

  async findById(id: string) {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findByName(name: string) {
    return this.roleRepository.findByName(name);
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.findByName(dto.name);

    if (existing) {
      throw new ConflictException('Role already exists');
    }

    return this.roleRepository.create(dto);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be modified.');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.findByName(dto.name);

      if (existing) {
        throw new ConflictException('Role name already exists.');
      }
    }

    return this.roleRepository.update(id, dto);
  }

  async delete(id: string) {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted.');
    }

    return this.roleRepository.delete(id);
  }

  async assignRole(userId: string, roleId: string, assignedById?: string) {
    const existing = await this.roleRepository.findUserRole(userId, roleId);

    if (existing) {
      throw new ConflictException('Role already assigned');
    }

    const role = await this.findById(roleId);

    // Prevent assigning disabled/system-invalid roles in future
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const created = await this.roleRepository.createUserRole(
      userId,
      roleId,
      assignedById,
    );

    await this.authorizationService.invalidateAuthorization(userId);

    return created;
  }

  async removeRole(userId: string, roleId: string, actorId?: string) {
    const role = await this.findById(roleId);

    /**
     * Prevent removing your own SUPER_ADMIN role.
     */
    if (
      actorId &&
      actorId === userId &&
      role.name === SystemRoles.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'You cannot remove your own Super Admin role.',
      );
    }

    /**
     * Prevent deleting the last SUPER_ADMIN.
     */
    if (role.name === SystemRoles.SUPER_ADMIN) {
      const totalSuperAdmins = await this.roleRepository.countSuperAdmins();

      if (totalSuperAdmins <= 1) {
        throw new ForbiddenException('At least one Super Admin must remain.');
      }
    }

    return this.roleRepository.deleteUserRole(userId, roleId).then((result) => {
      void this.authorizationService.invalidateAuthorization(userId);

      return result;
    });
  }

  async assignPermission(roleId: string, permissionId: string) {
    // Ensure role exists
    await this.findById(roleId);

    // Ensure permission exists
    await this.permissionService.findById(permissionId);

    // Prevent duplicates
    const existing = await this.roleRepository.findRolePermission(
      roleId,
      permissionId,
    );

    if (existing) {
      throw new ConflictException('Permission already assigned to role.');
    }

    const created = await this.roleRepository.createRolePermission(
      roleId,
      permissionId,
    );

    await this.authorizationService.invalidateUsersForRole(roleId);

    return created;
  }

  async removePermission(roleId: string, permissionId: string) {
    const relation = await this.roleRepository.findRolePermission(
      roleId,
      permissionId,
    );

    if (!relation) {
      throw new NotFoundException('Permission is not assigned to this role.');
    }

    await this.roleRepository.deleteRolePermissionById(relation.id);

    await this.authorizationService.invalidateUsersForRole(roleId);

    return {
      message: 'Permission removed successfully.',
    };
  }

  async getPermissions(roleId: string) {
    await this.findById(roleId);

    const permissions =
      await this.roleRepository.findPermissionsForRole(roleId);

    return permissions.map((item) => item.permission);
  }
}
