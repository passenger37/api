import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../core/database';

@Injectable()
export class RolePermissionSeeder {
  private readonly logger = new Logger(RolePermissionSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    this.logger.log('Assigning permissions to system roles...');

    const superAdmin = await this.prisma.role.findUnique({
      where: {
        name: 'SUPER_ADMIN',
      },
    });

    if (!superAdmin) {
      throw new Error('SUPER_ADMIN role not found.');
    }

    const [permissions, existing] = await this.prisma.$transaction([
      this.prisma.permission.findMany(),
      this.prisma.rolePermission.findMany({
        where: {
          roleId: superAdmin.id,
        },
        select: {
          permissionId: true,
        },
      }),
    ]);

    const existingIds = new Set(existing.map((item) => item.permissionId));

    const missing = permissions.filter(
      (permission) => !existingIds.has(permission.id),
    );

    let created = 0;

    if (missing.length > 0) {
      const result = await this.prisma.rolePermission.createMany({
        data: missing.map((permission) => ({
          roleId: superAdmin.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      created = result.count;
    }

    this.logger.log(`Assigned ${created} permission(s) to SUPER_ADMIN.`);
  }
}
