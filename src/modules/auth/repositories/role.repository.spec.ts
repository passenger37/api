import { RoleRepository } from './role.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let prisma: {
    role: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    userRole: {
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
      deleteMany: jest.Mock;
    };
    rolePermission: {
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userRole: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      rolePermission: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repository = new RoleRepository(prisma as any);
  });

  it('should find all roles ordered by name', async () => {
    prisma.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

    await repository.findAll();

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('should find a role by id', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });

    await repository.findById('role-1');

    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
  });

  it('should find a role by name', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });

    await repository.findByName('USER');

    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: 'USER' },
    });
  });

  it('should create a role', async () => {
    const dto = { name: 'MOD', description: 'Moderator' };
    prisma.role.create.mockResolvedValue({ ...dto, isSystem: false });

    const result = await repository.create(dto as any);

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { name: 'MOD', description: 'Moderator', isSystem: false },
    });
    expect(result).toEqual({
      name: 'MOD',
      description: 'Moderator',
      isSystem: false,
    });
  });

  it('should update a role', async () => {
    prisma.role.update.mockResolvedValue({ id: 'role-1', name: 'MOD' });

    await repository.update('role-1', { name: 'MOD' } as any);

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 'role-1' },
      data: { name: 'MOD' },
    });
  });

  it('should delete a role', async () => {
    prisma.role.delete.mockResolvedValue({ id: 'role-1' });

    await repository.delete('role-1');

    expect(prisma.role.delete).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
  });

  it('should find a user role by user and role', async () => {
    prisma.userRole.findFirst.mockResolvedValue({ id: 'ur-1' });

    await repository.findUserRole('user-1', 'role-1');

    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', roleId: 'role-1' },
    });
  });

  it('should create a user role', async () => {
    prisma.userRole.create.mockResolvedValue({ id: 'ur-1' });

    await repository.createUserRole('user-1', 'role-1', 'actor-1');

    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', roleId: 'role-1', assignedById: 'actor-1' },
    });
  });

  it('should count super admins scoped to the system role', async () => {
    prisma.userRole.count.mockResolvedValue(2);

    await repository.countSuperAdmins();

    expect(prisma.userRole.count).toHaveBeenCalledWith({
      where: {
        role: {
          name: 'SUPER_ADMIN',
        },
      },
    });
  });

  it('should delete a user role for a user and role', async () => {
    prisma.userRole.deleteMany.mockResolvedValue({ count: 1 });

    await repository.deleteUserRole('user-1', 'role-1');

    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', roleId: 'role-1' },
    });
  });

  it('should find a role permission by role and permission', async () => {
    prisma.rolePermission.findFirst.mockResolvedValue({ id: 'rp-1' });

    await repository.findRolePermission('role-1', 'perm-1');

    expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
      where: { roleId: 'role-1', permissionId: 'perm-1' },
    });
  });

  it('should create a role permission with its permission included', async () => {
    prisma.rolePermission.create.mockResolvedValue({ id: 'rp-1' });

    await repository.createRolePermission('role-1', 'perm-1');

    expect(prisma.rolePermission.create).toHaveBeenCalledWith({
      data: { roleId: 'role-1', permissionId: 'perm-1' },
      include: { permission: true },
    });
  });

  it('should delete a role permission by id', async () => {
    prisma.rolePermission.delete.mockResolvedValue({ id: 'rp-1' });

    await repository.deleteRolePermissionById('rp-1');

    expect(prisma.rolePermission.delete).toHaveBeenCalledWith({
      where: { id: 'rp-1' },
    });
  });

  it('should find role permissions with permission ordered by name', async () => {
    prisma.rolePermission.findMany.mockResolvedValue([]);

    await repository.findPermissionsForRole('role-1');

    expect(prisma.rolePermission.findMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
      include: { permission: true },
      orderBy: { permission: { name: 'asc' } },
    });
  });
});
