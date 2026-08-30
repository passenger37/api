import { Injectable, Logger } from '@nestjs/common';

import { PermissionSeeder } from '../seeders/permission.seeder';
import { RoleSeeder } from '../seeders/role.seeder';
import { RolePermissionSeeder } from '../seeders/role-permission.seeder';
import { SuperAdminSeeder } from '../seeders/super-admin.seeder';

import { REDIS_JOB_LOCK_TTL_MS } from '../../../core/redis/redis-keys';
import { RedisLockService } from '../../../core/redis/redis-lock.service';

@Injectable()
export class AuthorizationBootstrapService {
  private readonly logger = new Logger(AuthorizationBootstrapService.name);

  constructor(
    private readonly permissionSeeder: PermissionSeeder,
    private readonly roleSeeder: RoleSeeder,
    private readonly rolePermissionSeeder: RolePermissionSeeder,
    private readonly superAdminSeeder: SuperAdminSeeder,
    private readonly locks: RedisLockService,
  ) {}

  async bootstrap() {
    const { executed } = await this.locks.runExclusive(
      'authorization-bootstrap',
      REDIS_JOB_LOCK_TTL_MS,
      async () => {
        this.logger.log('Starting authorization bootstrap...');

        await this.permissionSeeder.seed();

        await this.roleSeeder.seed();

        await this.rolePermissionSeeder.seed();

        await this.superAdminSeeder.seed();

        this.logger.log('Authorization bootstrap completed.');
      },
    );

    if (!executed) {
      this.logger.log(
        'Authorization bootstrap skipped: another instance holds the lock.',
      );
    }
  }
}
