import { SeedContext } from '../utils/seed-context';

import { SYSTEM_ROLES } from '../constants/roles';

export class RoleSeed {
  async run(context: SeedContext) {
    for (const role of SYSTEM_ROLES) {
      await context.prisma.role.upsert({
        where: {
          name: role.name,
        },

        update: {},

        create: role,
      });
    }

    console.log('✅ Roles seeded');
  }
}