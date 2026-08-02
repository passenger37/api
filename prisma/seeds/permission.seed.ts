import { SeedContext } from '../utils/seed-context';

import { PERMISSIONS } from '../constants/permissions';

export class PermissionSeed {
  async run(context: SeedContext) {
    for (const permission of PERMISSIONS) {
      await context.prisma.permission.upsert({
        where: {
          name: permission.name,
        },

        update: {},

        create: permission,
      });
    }

    console.log('✅ Permissions seeded');
  }
}