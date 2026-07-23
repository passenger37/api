import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../core/database';

import { SYSTEM_PERMISSIONS } from '../constants/permissions';

@Injectable()
export class PermissionSeeder {
  private readonly logger = new Logger(PermissionSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    this.logger.log('Seeding system permissions...');

    let created = 0;

    for (const permission of SYSTEM_PERMISSIONS) {
      const exists = await this.prisma.permission.findUnique({
        where: {
          name: permission.name,
        },
      });

      if (exists) {
        continue;
      }

      await this.prisma.permission.create({
        data: {
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          description: `${permission.action} ${permission.resource}`,
        },
      });

      created++;
    }

    this.logger.log(`Created ${created} permission(s).`);
  }
}
