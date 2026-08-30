import { RoleMapper } from './role.mapper';
import { Role } from '@prisma/client';

describe('RoleMapper', () => {
  const role: Role = {
    id: 'role-1',
    name: 'MODERATOR',
    description: 'Moderates content',
    isSystem: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('should map a role row to a plain response without relations', () => {
    expect(RoleMapper.toResponse(role)).toEqual({
      id: 'role-1',
      name: 'MODERATOR',
      description: 'Moderates content',
      isSystem: true,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  });

  it('should map a list of role rows', () => {
    expect(RoleMapper.toResponseList([role])).toEqual([
      RoleMapper.toResponse(role),
    ]);
  });
});
