import { PermissionMapper } from './permission.mapper';
import { Permission, RolePermission } from '@prisma/client';

describe('PermissionMapper', () => {
  const permission: Permission = {
    id: 'perm-1',
    name: 'MESSAGE_SEND',
    description: 'Send messages',
    resource: 'message',
    action: 'send',
    isSystem: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const assignment: RolePermission = {
    id: 'rp-1',
    roleId: 'role-1',
    permissionId: 'perm-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('should map a permission row to a plain response without relations', () => {
    expect(PermissionMapper.toResponse(permission)).toEqual({
      id: 'perm-1',
      name: 'MESSAGE_SEND',
      description: 'Send messages',
      resource: 'message',
      action: 'send',
      isSystem: false,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    });
  });

  it('should map a list of permission rows', () => {
    expect(PermissionMapper.toResponseList([permission])).toEqual([
      PermissionMapper.toResponse(permission),
    ]);
  });

  it('should map an assignment row to a plain response', () => {
    expect(PermissionMapper.toAssignedRolePermission(assignment)).toEqual({
      id: 'rp-1',
      roleId: 'role-1',
      permissionId: 'perm-1',
      createdAt: assignment.createdAt,
    });
  });
});
