import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/database/index';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: {
        resource: 'asc',
      },
    });
  }

  async findById(id: string) {
    const permission =
      await this.prisma.permission.findUnique({
        where: { id },
      });

    if (!permission) {
      throw new NotFoundException(
        'Permission not found',
      );
    }

    return permission;
  }

  async findByName(name: string) {
    return this.prisma.permission.findUnique({
      where: {
        name,
      },
    });
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ) {
    const existing =
      await this.prisma.rolePermission.findFirst({
        where: {
          roleId,
          permissionId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Permission already assigned to role',
      );
    }

    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });
  }
}