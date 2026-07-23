import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../core/database';

import { SYSTEM_ROLES } from '../constants/roles';

@Injectable()
export class RoleSeeder {
  private readonly logger = new Logger(RoleSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    this.logger.log('Seeding system roles...');

    let created = 0;

    for (const role of SYSTEM_ROLES) {
      const exists = await this.prisma.role.findUnique({
        where: {
          name: role.name,
        },
      });

      if (exists) {
        continue;
      }

      await this.prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
        },
      });

      created++;
    }

    this.logger.log(`Created ${created} role(s).`);
  }
}
