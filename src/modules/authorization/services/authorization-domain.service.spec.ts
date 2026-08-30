import { AuthorizationDomainService } from './authorization-domain.service';
import { AuthorizationRepository } from '../repositories/authorization.repository';
import { PermissionCacheService } from './permission-cache.service';

describe('AuthorizationDomainService', () => {
  const repository = {
    findUsersByRole: jest.fn(),
    incrementPermissionVersions: jest.fn(),
    createRolePermission: jest.fn(),
    createManyRolePermissions: jest.fn(),
    deleteRolePermission: jest.fn(),
    deleteRolePermissionsByRole: jest.fn(),
  } as unknown as AuthorizationRepository;

  const permissionCacheService = {
    delete: jest.fn(),
  } as unknown as PermissionCacheService;

  let service: AuthorizationDomainService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthorizationDomainService(
      repository,
      permissionCacheService,
    );
  });

  describe('bumpPermissionVersionForRoleUsers', () => {
    it('increments versions atomically and invalidates the cache for every user of the role', async () => {
      (repository.findUsersByRole as jest.Mock).mockResolvedValue({
        users: [{ userId: 'u1' }, { userId: 'u2' }],
      });
      (repository.incrementPermissionVersions as jest.Mock).mockResolvedValue(
        undefined,
      );
      (permissionCacheService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.bumpPermissionVersionForRoleUsers('role-1');

      expect(repository.incrementPermissionVersions).toHaveBeenCalledWith([
        'u1',
        'u2',
      ]);
      expect(permissionCacheService.delete).toHaveBeenCalledWith('u1');
      expect(permissionCacheService.delete).toHaveBeenCalledWith('u2');
    });

    it('does nothing when the role does not exist', async () => {
      (repository.findUsersByRole as jest.Mock).mockResolvedValue(null);

      await service.bumpPermissionVersionForRoleUsers('missing');

      expect(repository.incrementPermissionVersions).not.toHaveBeenCalled();
      expect(permissionCacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignPermission', () => {
    it('delegates to the repository', async () => {
      await service.assignPermission('role-1', 'perm-1');

      expect(repository.createRolePermission).toHaveBeenCalledWith({
        role: { connect: { id: 'role-1' } },
        permission: { connect: { id: 'perm-1' } },
      });
    });
  });
});
