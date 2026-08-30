import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { SystemRoles } from '../../../common/constants/system-roles';

import { CreateRoleDto, UpdateRoleDto } from '../dto';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  findByName(name: string) {
    return this.prisma.role.findUnique({
      where: {
        name,
      },
    });
  }

  create(data: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem ?? false,
      },
    });
  }

  update(id: string, data: UpdateRoleDto) {
    return this.prisma.role.update({
      where: {
        id,
      },

      data,
    });
  }

  delete(id: string) {
    return this.prisma.role.delete({
      where: {
        id,
      },
    });
  }

  findUserRole(userId: string, roleId: string) {
    return this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
      },
    });
  }

  createUserRole(userId: string, roleId: string, assignedById?: string) {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedById,
      },
    });
  }

  countSuperAdmins() {
    return this.prisma.userRole.count({
      where: {
        role: {
          name: SystemRoles.SUPER_ADMIN,
        },
      },
    });
  }

  deleteUserRole(userId: string, roleId: string) {
    return this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }

  findRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  createRolePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },

      include: {
        permission: true,
      },
    });
  }

  deleteRolePermissionById(id: string) {
    return this.prisma.rolePermission.delete({
      where: {
        id,
      },
    });
  }

  findPermissionsForRole(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
      },

      include: {
        permission: true,
      },

      orderBy: {
        permission: {
          name: 'asc',
        },
      },
    });
  }
}
