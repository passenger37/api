import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/database';
import { SystemRoles } from '../../../common/constants/system-roles';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
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
}