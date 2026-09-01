import { PrismaService } from '../../core/database/prisma.service';
import {
  createDbTestHarness,
  DbTestContext,
} from './db-test.harness';
import { createChannelMessage, createServer, seedDbFixture, DbFixture } from './db-test.fixtures';

describe('Database Integration: constraints (40.87)', () => {
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

  it('enforces the unique (clientMessageId, authorMemberId) idempotency key', async () => {
    const clientMessageId = crypto.randomUUID();
    await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'dedupe-1',
      30,
      clientMessageId,
    );

    await expect(
      createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        'dedupe-2',
        31,
        clientMessageId,
      ),
    ).rejects.toMatchObject({ code: 'P2002' });

    // the same clientMessageId is allowed for a *different* author (composite key)
    const other = await createChannelMessage(
      prisma,
      fixture,
      fixture.memberMemberId,
      'dedupe-other',
      32,
      clientMessageId,
    );
    expect(other.id).toBeTruthy();
  });

  it('enforces the unique (messageId, memberId, emoji) reaction key', async () => {
    const message = await createChannelMessage(prisma, fixture, fixture.ownerMemberId, 'react-target', 33);

    await prisma.channelMessageReaction.create({
      data: { messageId: message.id, memberId: fixture.ownerMemberId, emoji: '👍' },
    });

    await expect(
      prisma.channelMessageReaction.create({
        data: { messageId: message.id, memberId: fixture.ownerMemberId, emoji: '👍' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a reaction on a message that does not exist (FK)', async () => {
    await expect(
      prisma.channelMessageReaction.create({
        data: { messageId: 'missing-message-id', memberId: fixture.ownerMemberId, emoji: '🎉' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('enforces the unique (serverId, userId) membership key', async () => {
    // createServer already enrolls the owner; adding them again must be rejected
    const { serverId } = await createServer(prisma, fixture);

    await expect(
      prisma.serverMember.create({
        data: { serverId, userId: fixture.ownerUserId },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('cascades deletion of a server to its messages', async () => {
    const server = await prisma.server.create({
      data: { name: 'Cascade Server', slug: `cascade-${crypto.randomUUID().slice(0, 8)}`, ownerId: fixture.ownerUserId },
    });
    const member = await prisma.serverMember.create({
      data: { serverId: server.id, userId: fixture.memberUserId },
    });
    const channel = await prisma.serverChannel.create({
      data: { serverId: server.id, createdById: fixture.ownerUserId, name: `ch-${crypto.randomUUID().slice(0, 6)}`, type: 'TEXT', position: 0 },
    });
    const message = await prisma.channelMessage.create({
      data: { content: 'cascade-me', serverId: server.id, channelId: channel.id, authorMemberId: member.id, messageSeq: 1 },
    });

    await prisma.server.delete({ where: { id: server.id } });

    expect(await prisma.channelMessage.findUnique({ where: { id: message.id } })).toBeNull();
    expect(await prisma.serverMember.count({ where: { serverId: server.id } })).toBe(0);
  });
});
