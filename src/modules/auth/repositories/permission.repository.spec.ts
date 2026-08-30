import { PermissionRepository } from './permission.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('PermissionRepository', () => {
  let repository: PermissionRepository;
  let prisma: {
    permission: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    rolePermission: {
      findFirst: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    userRole: {
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      permission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      rolePermission: {
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      userRole: {
        count: jest.fn(),
      },
    };
    repository = new PermissionRepository(prisma as any);
  });

  it('should find all permissions ordered by resource', async () => {
    prisma.permission.findMany.mockResolvedValue([{ id: 'perm-1' }]);

    await repository.findAll();

    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      orderBy: { resource: 'asc' },
    });
  });

  it('should find a permission by id', async () => {
    prisma.permission.findUnique.mockResolvedValue({ id: 'perm-1' });

    await repository.findById('perm-1');

    expect(prisma.permission.findUnique).toHaveBeenCalledWith({
      where: { id: 'perm-1' },
    });
  });

  it('should find a permission by name', async () => {
    prisma.permission.findUnique.mockResolvedValue({ id: 'perm-1' });

    await repository.findByName('MESSAGE_SEND');

    expect(prisma.permission.findUnique).toHaveBeenCalledWith({
      where: { name: 'MESSAGE_SEND' },
    });
  });

  it('should find a role permission by role and permission', async () => {
    prisma.rolePermission.findFirst.mockResolvedValue({ id: 'rp-1' });

    await repository.findRolePermission('role-1', 'perm-1');

    expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
      where: { roleId: 'role-1', permissionId: 'perm-1' },
    });
  });

  it('should create a role permission', async () => {
    prisma.rolePermission.create.mockResolvedValue({ id: 'rp-1' });

    await repository.createRolePermission('role-1', 'perm-1');

    expect(prisma.rolePermission.create).toHaveBeenCalledWith({
      data: { roleId: 'role-1', permissionId: 'perm-1' },
    });
  });

  it('should remove a role permission by role and permission', async () => {
    prisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 });

    await repository.removeRolePermission('role-1', 'perm-1');

    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1', permissionId: 'perm-1' },
    });
  });

  it('should count user roles granted a permission within the user scope', async () => {
    prisma.userRole.count.mockResolvedValue(1);

    await repository.countUsersWithPermission('user-1', 'MESSAGE_SEND');

    expect(prisma.userRole.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        role: {
          permissions: {
            some: {
              permission: {
                name: 'MESSAGE_SEND',
              },
            },
          },
        },
      },
    });
  });
});
