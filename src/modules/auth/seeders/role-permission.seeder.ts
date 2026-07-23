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

    const permissions = await this.prisma.permission.findMany();

    let created = 0;

    for (const permission of permissions) {
      const exists = await this.prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id,
          },
        },
      });

      if (exists) {
        continue;
      }

      await this.prisma.rolePermission.create({
        data: {
          roleId: superAdmin.id,
          permissionId: permission.id,
        },
      });

      created++;
    }

    this.logger.log(`Assigned ${created} permission(s) to SUPER_ADMIN.`);
  }
}
