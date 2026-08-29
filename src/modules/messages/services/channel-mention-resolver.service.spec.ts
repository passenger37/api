import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MentionType } from '@prisma/client';

import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerRoleQueryService } from '../../servers/services/server-role-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

import { ChannelMentionResolver } from './channel-mention-resolver.service';

describe('ChannelMentionResolver', () => {
  let resolver: ChannelMentionResolver;
  let memberQueryService: { getMembers: jest.Mock };
  let roleQueryService: { getRoleByName: jest.Mock };
  let permissionService: { hasPermission: jest.Mock };

  beforeEach(async () => {
    memberQueryService = { getMembers: jest.fn() };
    roleQueryService = { getRoleByName: jest.fn() };
    permissionService = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMentionResolver,
        { provide: ServerMemberQueryService, useValue: memberQueryService },
        { provide: ServerRoleQueryService, useValue: roleQueryService },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    resolver = module.get<ChannelMentionResolver>(ChannelMentionResolver);
  });

  it('should resolve @everyone when the actor has permission', async () => {
    permissionService.hasPermission.mockResolvedValue(true);

    const result = await resolver.resolve(
      'hello @everyone',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(permissionService.hasPermission).toHaveBeenCalledWith(
      'srv-1',
      'user-1',
      'MANAGE_MESSAGES',
      'ch-1',
    );
    expect(result).toEqual([
      {
        mentionType: MentionType.EVERYONE,
        targetMemberId: null,
        targetRoleId: null,
      },
    ]);
  });

  it('should reject @everyone without permission', async () => {
    permissionService.hasPermission.mockResolvedValue(false);

    await expect(
      resolver.resolve('all @everyone', 'srv-1', 'ch-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should resolve a role mention by name', async () => {
    roleQueryService.getRoleByName.mockResolvedValue({ id: 'role-1' });

    const result = await resolver.resolve(
      'ping @role:admin',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(roleQueryService.getRoleByName).toHaveBeenCalledWith(
      'srv-1',
      'admin',
    );
    expect(result).toEqual([
      {
        mentionType: MentionType.ROLE,
        targetMemberId: null,
        targetRoleId: 'role-1',
      },
    ]);
  });

  it('should ignore a role mention that does not exist', async () => {
    roleQueryService.getRoleByName.mockResolvedValue(null);

    const result = await resolver.resolve(
      'ping @role:ghost',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(result).toEqual([]);
  });

  it('should resolve a member mention by nickname', async () => {
    memberQueryService.getMembers.mockResolvedValue({
      items: [
        {
          id: 'member-2',
          nickname: 'alice',
          user: { id: 'u2', username: 'alice_dev' },
        },
      ],
    });

    const result = await resolver.resolve(
      'hi @alice',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(memberQueryService.getMembers).toHaveBeenCalledWith('srv-1', {
      query: 'alice',
      page: 1,
      limit: 50,
    });
    expect(result).toEqual([
      {
        mentionType: MentionType.MEMBER,
        targetMemberId: 'member-2',
        targetRoleId: null,
      },
    ]);
  });

  it('should resolve a member mention by username', async () => {
    memberQueryService.getMembers.mockResolvedValue({
      items: [
        { id: 'member-3', nickname: null, user: { id: 'u3', username: 'bob' } },
      ],
    });

    const result = await resolver.resolve('hi @bob', 'srv-1', 'ch-1', 'user-1');

    expect(result).toEqual([
      {
        mentionType: MentionType.MEMBER,
        targetMemberId: 'member-3',
        targetRoleId: null,
      },
    ]);
  });

  it('should ignore a member mention that does not match exactly', async () => {
    memberQueryService.getMembers.mockResolvedValue({
      items: [
        {
          id: 'member-4',
          nickname: 'carol',
          user: { id: 'u4', username: 'carol_x' },
        },
      ],
    });

    const result = await resolver.resolve(
      'hi @carolius',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(result).toEqual([]);
  });

  it('should deduplicate repeated mentions of the same target', async () => {
    permissionService.hasPermission.mockResolvedValue(true);

    const result = await resolver.resolve(
      '@everyone @everyone @everyone',
      'srv-1',
      'ch-1',
      'user-1',
    );

    expect(result).toEqual([
      {
        mentionType: MentionType.EVERYONE,
        targetMemberId: null,
        targetRoleId: null,
      },
    ]);
  });

  it('should reject messages with more than fifty mentions', async () => {
    const content = Array.from({ length: 51 }, (_, i) => `@user${i}`).join(' ');

    await expect(
      resolver.resolve(content, 'srv-1', 'ch-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
