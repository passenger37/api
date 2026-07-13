import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/database/index';

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
      throw new NotFoundException(
        'Role not found',
      );
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
  ) {
    return this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }
}