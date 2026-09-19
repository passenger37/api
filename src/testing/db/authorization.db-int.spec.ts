import { PrismaService } from '../../core/database/prisma.service';
import { createDbTestHarness, DbTestContext } from './db-test.harness';
import { seedDbFixture, DbFixture } from './db-test.fixtures';

describe('Database Integration: authorization (40.87)', () => {
  let ctx: DbTestContext;
  let prisma: PrismaService;
  let fixture: DbFixture;

  beforeAll(async () => {
    ctx = await createDbTestHarness();
    prisma = ctx.prisma;
    fixture = await seedDbFixture(prisma);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('resolves global permissions granted through a user role chain', async () => {
    const role = await prisma.role.create({
      data: { name: `moderator-${crypto.randomUUID().slice(0, 8)}` },
    });
    const perm = await prisma.permission.create({
      data: {
        name: `msg.send-${crypto.randomUUID().slice(0, 8)}`,
        resource: 'channel_message',
        action: 'send',
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
    await prisma.userRole.create({
      data: { userId: fixture.ownerUserId, roleId: role.id },
    });

    const granted = await prisma.rolePermission.findMany({
      where: {
        role: { users: { some: { userId: fixture.ownerUserId } } },
        permission: { name: perm.name },
      },
    });
    expect(granted).toHaveLength(1);
  });

  it('resolves the set of ServerPermission names granted to a member via their server roles', async () => {
    const server = await prisma.server.create({
      data: {
        name: `Auth Server ${crypto.randomUUID().slice(0, 6)}`,
        slug: `auth-${crypto.randomUUID().slice(0, 8)}`,
        ownerId: fixture.ownerUserId,
      },
    });
    const member = await prisma.serverMember.create({
      data: { serverId: server.id, userId: fixture.ownerUserId },
    });
    const serverRole = await prisma.serverRole.create({
      data: {
        serverId: server.id,
        name: `contributor-${crypto.randomUUID().slice(0, 6)}`,
        position: 1,
      },
    });
    await prisma.serverMemberRole.create({
      data: { memberId: member.id, roleId: serverRole.id },
    });
    await prisma.serverRolePermission.create({
      data: { roleId: serverRole.id, permission: 'CHANNEL_VIEW' },
    });

    const perms = await prisma.serverRolePermission.findMany({
      where: { role: { members: { some: { memberId: member.id } } } },
      select: { permission: true },
    });
    const names = perms.map((p) => p.permission);
    expect(names).toContain('CHANNEL_VIEW');
  });

  it('stores a channel-level allow overwrite that overrides a global server role', async () => {
    const server = await prisma.server.create({
      data: {
        name: `Overwrite Server ${crypto.randomUUID().slice(0, 6)}`,
        slug: `ow-${crypto.randomUUID().slice(0, 8)}`,
        ownerId: fixture.ownerUserId,
      },
    });
    const member = await prisma.serverMember.create({
      data: { serverId: server.id, userId: fixture.ownerUserId },
    });
    const channel = await prisma.serverChannel.create({
      data: {
        serverId: server.id,
        createdById: fixture.ownerUserId,
        name: `ow-ch-${crypto.randomUUID().slice(0, 6)}`,
        type: 'TEXT',
        position: 0,
      },
    });
    const serverRole = await prisma.serverRole.create({
      data: {
        serverId: server.id,
        name: `viewer-${crypto.randomUUID().slice(0, 6)}`,
        position: 1,
      },
    });
    await prisma.serverMemberRole.create({
      data: { memberId: member.id, roleId: serverRole.id },
    });

    await prisma.serverRolePermission.create({
      data: { roleId: serverRole.id, permission: 'CHANNEL_VIEW' },
    });
    // deny on this channel for the same role
    await prisma.serverChannelPermissionOverwrite.create({
      data: {
        channelId: channel.id,
        roleId: serverRole.id,
        permission: 'CHANNEL_VIEW',
        deny: true,
      },
    });

    const effDenied = await prisma.serverChannelPermissionOverwrite.findMany({
      where: { channelId: channel.id, deny: true },
    });
    expect(effDenied).toHaveLength(1);
    expect(effDenied[0].permission).toBe('CHANNEL_VIEW');
  });
});
