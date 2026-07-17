import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/database';
import { CreateRoleDto, UpdateRoleDto } from '../dto';
import { SystemRoles } from '../../../common/constants/system-roles';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
     private readonly permissionService: PermissionService,
  ) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: {
        name,
      },
    });
  }

  async create(dto: CreateRoleDto) {
  const existing = await this.findByName(dto.name);

  if (existing) {
    throw new ConflictException(
      'Role already exists',
    );
  }

  return this.prisma.role.create({
    data: {
      name: dto.name,
      description: dto.description,
      isSystem: dto.isSystem ?? false,
    },
  });
}

async update(
  id: string,
  dto: UpdateRoleDto,
) {
  const role = await this.findById(id);

  if (role.isSystem) {
    throw new ForbiddenException(
      'System roles cannot be modified.',
    );
  }

  if (
    dto.name &&
    dto.name !== role.name
  ) {
    const existing = await this.findByName(
      dto.name,
    );

    if (existing) {
      throw new ConflictException(
        'Role name already exists.',
      );
    }
  }

  return this.prisma.role.update({
    where: {
      id,
    },
    data: dto,
  });
}

async delete(id: string) {
  const role = await this.findById(id);

  if (role.isSystem) {
    throw new ForbiddenException(
      'System roles cannot be deleted.',
    );
  }

  return this.prisma.role.delete({
    where: {
      id,
    },
  });
}

  async assignRole(
    userId: string,
    roleId: string,
    assignedById?: string,
  ) {
    const existing =
      await this.prisma.userRole.findFirst({
        where: {
          userId,
          roleId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Role already assigned',
      );
    }

    const role = await this.findById(roleId);

    // Prevent assigning disabled/system-invalid roles in future
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedById,
      },
    });
  }

  async removeRole(
    userId: string,
    roleId: string,
    actorId?: string,
  ) {
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
      const totalSuperAdmins =
        await this.prisma.userRole.count({
          where: {
            role: {
              name: SystemRoles.SUPER_ADMIN,
            },
          },
        });

      if (totalSuperAdmins <= 1) {
        throw new ForbiddenException(
          'At least one Super Admin must remain.',
        );
      }
    }

    return this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }

  async assignPermission(
  roleId: string,
  permissionId: string,
) {
  // Ensure role exists
  await this.findById(roleId);

  // Ensure permission exists
  await this.permissionService.findById(permissionId);

  // Prevent duplicates
  const existing =
    await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });

  if (existing) {
    throw new ConflictException(
      'Permission already assigned to role.',
    );
  }

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

async removePermission(
  roleId: string,
  permissionId: string,
) {
  const relation =
    await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });

  if (!relation) {
    throw new NotFoundException(
      'Permission is not assigned to this role.',
    );
  }

  await this.prisma.rolePermission.delete({
    where: {
      id: relation.id,
    },
  });

  return {
    message:
      'Permission removed successfully.',
  };
}

async getPermissions(roleId: string) {
  await this.findById(roleId);

  const permissions =
    await this.prisma.rolePermission.findMany({
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

  return permissions.map(
    (item) => item.permission,
  );
}


}