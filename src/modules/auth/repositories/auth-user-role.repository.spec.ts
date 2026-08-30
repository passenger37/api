import { AuthUserRoleRepository } from './auth-user-role.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('AuthUserRoleRepository', () => {
  let repository: AuthUserRoleRepository;
  let prisma: { userRole: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { userRole: { findMany: jest.fn() } };
    repository = new AuthUserRoleRepository(prisma as any);
  });

  it('should find user roles with nested permissions', async () => {
    prisma.userRole.findMany.mockResolvedValue([]);

    await repository.findUserRolesWithPermissions('user-1');

    expect(prisma.userRole.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  });

  it('should find user roles with their role', async () => {
    prisma.userRole.findMany.mockResolvedValue([]);

    await repository.findUserRolesWithRole('user-1');

    expect(prisma.userRole.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: { role: true },
    });
  });
});
