import { PrismaService } from '../../core/database/prisma.service';
import { createDbTestHarness, DbTestContext } from './db-test.harness';
import {
  createChannelMessage,
  seedDbFixture,
  DbFixture,
} from './db-test.fixtures';

describe('Database Integration: transactions (40.87)', () => {
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

  it('commits a multi-write transaction atomically', async () => {
    const first = await prisma.$transaction(async (tx) => {
      const a = await tx.channelMessage.create({
        data: {
          content: 'tx-a',
          serverId: fixture.serverId,
          channelId: fixture.channelId,
          authorMemberId: fixture.ownerMemberId,
          messageSeq: 1,
        },
      });
      const b = await tx.channelMessage.create({
        data: {
          content: 'tx-b',
          serverId: fixture.serverId,
          channelId: fixture.channelId,
          authorMemberId: fixture.ownerMemberId,
          messageSeq: 2,
        },
      });
      return [a.id, b.id];
    });

    expect(first).toHaveLength(2);
    for (const id of first) {
      const found = await prisma.channelMessage.findUnique({ where: { id } });
      expect(found).not.toBeNull();
    }
  });

  it('rolls back all writes when the transaction throws', async () => {
    const seed = await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'before',
      3,
    );

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.channelMessage.create({
          data: {
            content: 'should-rollback',
            serverId: fixture.serverId,
            channelId: fixture.channelId,
            authorMemberId: fixture.ownerMemberId,
            messageSeq: 4,
          },
        });
        // second write fails -> the whole tx must roll back
        await tx.channelMessage.create({
          data: {
            content: 'breaks',
            serverId: 'no-such-server',
            channelId: fixture.channelId,
            authorMemberId: 'no-such-member',
            messageSeq: 5,
          },
        });
      }),
    ).rejects.toBeInstanceOf(Error);

    const after = await prisma.channelMessage.findMany({
      where: {
        channelId: fixture.channelId,
        content: { in: ['should-rollback', 'breaks'] },
      },
    });
    expect(after).toHaveLength(0);

    // the write from a completed transaction is still there
    const preserved = await prisma.channelMessage.findUnique({
      where: { id: seed.id },
    });
    expect(preserved).not.toBeNull();
  });
});
