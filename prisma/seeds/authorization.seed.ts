import { SeedContext } from '../utils/seed-context';

import { PermissionSeed } from './permission.seed';
import { RoleSeed } from './role.seed';
import { RolePermissionSeed } from './role-permission.seed';
import { SuperAdminSeed } from './super-admin.seed';

export class AuthorizationSeed {
  async run(
    context: SeedContext,
  ) {
    await new PermissionSeed().run(context);

    await new RoleSeed().run(context);

    await new RolePermissionSeed().run(context);

    await new SuperAdminSeed().run(context);
  }
}