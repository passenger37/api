import { AuthorizationBootstrapService } from './authorization-bootstrap.service';
import { RoleSeeder } from '../seeders/role.seeder';
import { RedisLockService } from '../../../core/redis/redis-lock.service';

describe('AuthorizationBootstrapService', () => {
  const permissionSeeder = { seed: jest.fn() };
  const roleSeeder = { seed: jest.fn() };
  const rolePermissionSeeder = { seed: jest.fn() };
  const superAdminSeeder = { seed: jest.fn() };

  const locks = {
    runExclusive: jest.fn(),
  } as unknown as RedisLockService;

  let service: AuthorizationBootstrapService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthorizationBootstrapService(
      permissionSeeder as never,
      roleSeeder as never,
      rolePermissionSeeder as never,
      superAdminSeeder as never,
      locks as never,
    );
  });

  it('runs the seeders when the lock is acquired', async () => {
    (locks.runExclusive as jest.Mock).mockImplementation(
      async (_n, _t, job) => {
        await job();
        return { executed: true, result: null };
      },
    );

    await service.bootstrap();

    expect(permissionSeeder.seed).toHaveBeenCalledTimes(1);
    expect(roleSeeder.seed).toHaveBeenCalledTimes(1);
    expect(rolePermissionSeeder.seed).toHaveBeenCalledTimes(1);
    expect(superAdminSeeder.seed).toHaveBeenCalledTimes(1);
  });

  it('skips seeding when another instance holds the lock', async () => {
    (locks.runExclusive as jest.Mock).mockResolvedValue({
      executed: false,
      result: null,
    });

    await service.bootstrap();

    expect(permissionSeeder.seed).not.toHaveBeenCalled();
    expect(roleSeeder.seed).not.toHaveBeenCalled();
    expect(rolePermissionSeeder.seed).not.toHaveBeenCalled();
    expect(superAdminSeeder.seed).not.toHaveBeenCalled();
  });
});
