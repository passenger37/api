import { SeedContext } from '../utils/seed-context';

import { ROLE_PERMISSIONS } from '../constants/permissions';

export class RolePermissionSeed {
  async run(context: SeedContext) {
    for (const roleName of Object.keys(
      ROLE_PERMISSIONS,
    )) {

      const role =
        await context.prisma.role.findUniqueOrThrow({
          where: {
            name: roleName,
          },
        });

      const permissions =
        ROLE_PERMISSIONS[
          roleName as keyof typeof ROLE_PERMISSIONS
        ];

      for (const permissionName of permissions) {

        const permission =
          await context.prisma.permission.findUniqueOrThrow({
            where: {
              name: permissionName,
            },
          });

        await context.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },

          update: {},

          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log(
      '✅ Role permissions seeded',
    );
  }
}