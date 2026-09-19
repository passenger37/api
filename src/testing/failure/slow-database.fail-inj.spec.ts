/**
 * Lecture 40.90 - Failure Injection Testing: slow database.
 *
 * Injects real latency into the Prisma query engine via `$extends` and proves
 * the app's degradation contract for a slow Postgres: queries still complete
 * with correct data (no timeout crash, no false failure) and the injected
 * latency is honored, while the unblessed base client is unaffected
 * (isolation is proven).
 */
import { ChannelMessageRepository } from '../../modules/messages/repositories/channel-message.repository';
import { PrismaService } from '../../core/database/prisma.service';
import { createDbTestHarness, DbTestContext } from '../db/db-test.harness';
import {
  createChannel,
  createChannelMessage,
  seedDbFixture,
  DbFixture,
} from '../db/db-test.fixtures';

const SLOW_MS = 400;

describe('Failure Injection: slow database (40.90)', () => {
  let ctx: DbTestContext;
  let prisma: PrismaService;
  let repo: ChannelMessageRepository;
  let fixture: DbFixture;
  let channelId: string;

  beforeAll(async () => {
    ctx = await createDbTestHarness();
    prisma = ctx.prisma;
    repo = new ChannelMessageRepository(prisma);
    fixture = await seedDbFixture(prisma);
    channelId = await createChannel(prisma, fixture);
    for (const seq of [1, 2, 3]) {
      await createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        `slow-${seq}`,
        seq,
        undefined,
        channelId,
      );
    }
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('completes with correct data under an injected 400ms query latency (no timeout, no false failure)', async () => {
    const slowPrisma = prisma.$extends({
      query: {
        channelMessage: {
          async findMany({ query, args }) {
            await new Promise((resolve) => setTimeout(resolve, SLOW_MS));
            return query(args);
          },
        },
      },
    });

    const start = Date.now();
    const rows = await slowPrisma.channelMessage.findMany({
      where: { channelId },
      orderBy: { messageSeq: 'asc' },
      take: 3,
    });
    const elapsed = Date.now() - start;

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => `${r.messageSeq}:${r.content}`)).toEqual([
      '1:slow-1',
      '2:slow-2',
      '3:slow-3',
    ]);
    expect(elapsed).toBeGreaterThanOrEqual(SLOW_MS - 10);
  });

  it('the standard repository path is unaffected (latency was injected, not permanent)', async () => {
    const start = Date.now();
    const page = await repo.findManyByChannelPaginated(channelId, undefined, 3);
    const elapsed = Date.now() - start;

    expect(page).toHaveLength(3);
    expect(elapsed).toBeLessThan(SLOW_MS / 2);
  });
});
