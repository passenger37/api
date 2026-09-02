/**
 * Lecture 40.90 - Failure Injection Testing: duplicate request.
 *
 * Proves the idempotency contract under injected duplicates against the real
 * Postgres schema + the real message repository: a second write carrying the
 * same (`clientMessageId`, authorMemberId) hits the unique constraint (P2002)
 * and the recovery contract re-reads the original row - exactly what
 * `ChannelMessageCommandService.createMessage` relies on to return
 * `{ deduplicated: true }` instead of re-creating or surfacing an error.
 */
import { Prisma } from '@prisma/client';

import { ChannelMessageRepository } from '../../modules/messages/repositories/channel-message.repository';
import { PrismaService } from '../../core/database/prisma.service';
import {
  createDbTestHarness,
  DbTestContext,
} from '../db/db-test.harness';
import {
  createChannel,
  createChannelMessage,
  seedDbFixture,
  DbFixture,
} from '../db/db-test.fixtures';

describe('Failure Injection: duplicate request (40.90)', () => {
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
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('a resent message with the same clientMessageId is recovered via the dedup lookup, not re-created', async () => {
    const clientMessageId = `dup-${Date.now()}`;
    const first = await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'original',
      100,
      clientMessageId,
      channelId,
    );

    // Recovery contract: the pre-check lookup returns the original.
    const existing = await repo.findByClientMessageId(
      clientMessageId,
      fixture.ownerMemberId,
    );
    expect(existing?.id).toBe(first.id);

    // Injection: the client retries the same logical request. The unique
    // constraint fires and createMessage's catch re-runs the lookup.
    let duplicateError: unknown;
    try {
      await createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        'resent-retry',
        101,
        clientMessageId,
        channelId,
      );
    } catch (error) {
      duplicateError = error;
    }

    expect(duplicateError).toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    if (duplicateError instanceof Prisma.PrismaClientKnownRequestError) {
      expect(duplicateError.code).toBe('P2002');
    }

    const rowCount = await prisma.channelMessage.count({
      where: { clientMessageId },
    });
    expect(rowCount).toBe(1);
  });

  it('concurrent duplicate requests resolve to exactly one row', async () => {
    const clientMessageId = `dup-race-${Date.now()}`;

    const results = await Promise.allSettled([
      createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        'race-a',
        200,
        clientMessageId,
        channelId,
      ),
      createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        'race-b',
        201,
        clientMessageId,
        channelId,
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejectedCodes = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason as Prisma.PrismaClientKnownRequestError).code);

    expect(fulfilled).toHaveLength(1);
    expect(rejectedCodes).toContain('P2002');

    const rowCount = await prisma.channelMessage.count({
      where: { clientMessageId },
    });
    expect(rowCount).toBe(1);
  });
});