import { ChannelMessageRepository } from '../../modules/messages/repositories/channel-message.repository';
import { PrismaService } from '../../core/database/prisma.service';
import { createDbTestHarness, DbTestContext } from './db-test.harness';
import {
  createChannel,
  createChannelMessage,
  seedDbFixture,
  DbFixture,
} from './db-test.fixtures';

describe('Database Integration: message repository (40.87)', () => {
  let ctx: DbTestContext;
  let prisma: PrismaService;
  let repo: ChannelMessageRepository;
  let fixture: DbFixture;

  beforeAll(async () => {
    ctx = await createDbTestHarness();
    prisma = ctx.prisma;
    repo = new ChannelMessageRepository(prisma);
    fixture = await seedDbFixture(prisma);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('creates and reads back a message', async () => {
    const channelId = await createChannel(prisma, fixture);
    const created = await repo.create({
      content: 'hello from the repository',
      server: { connect: { id: fixture.serverId } },
      channel: { connect: { id: channelId } },
      author: { connect: { id: fixture.ownerMemberId } },
      messageSeq: 10,
    });

    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.content).toBe('hello from the repository');
    expect(found?.id).toBe(created.id);
  });

  it('paginates a channel with a cursor in newest-first order', async () => {
    const channelId = await createChannel(prisma, fixture);
    const seqs = [11, 12, 13, 14];
    const ids: string[] = [];
    for (const seq of seqs) {
      const entry = await createChannelMessage(
        prisma,
        fixture,
        fixture.ownerMemberId,
        `page-message-${seq}`,
        seq,
        undefined,
        channelId,
      );
      ids.push(entry.id);
    }

    const firstPage = await repo.findManyByChannelPaginated(
      channelId,
      undefined,
      3,
    );
    expect(firstPage).toHaveLength(3);
    // newest first -> 14 appears before 11
    expect(firstPage[0].messageSeq).toBe(14);
    expect(firstPage[1].messageSeq).toBe(13);

    const cursor = firstPage[2].id;
    const secondPage = await repo.findManyByChannelPaginated(
      channelId,
      cursor,
      3,
    );
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0].messageSeq).toBe(11);
  });

  it('soft-deletes without removing the row', async () => {
    const channelId = await createChannel(prisma, fixture);
    const entry = await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'to-delete',
      20,
      undefined,
      channelId,
    );

    const deleted = await repo.softDelete(entry.id);
    expect(deleted.isDeleted).toBe(true);

    // excluded from channel listings but still physically present
    const viaGh = await prisma.channelMessage.findUnique({
      where: { id: entry.id },
    });
    expect(viaGh?.isDeleted).toBe(true);
  });

  it('pins a message and lists it among pinned messages', async () => {
    const channelId = await createChannel(prisma, fixture);
    const entry = await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'pin-me',
      21,
      undefined,
      channelId,
    );

    const pinned = await repo.pin(entry.id);
    expect(pinned.isPinned).toBe(true);

    const pinnedList = await repo.findPinnedMessages(channelId);
    expect(pinnedList.some((m) => m.id === entry.id)).toBe(true);

    await repo.unpin(entry.id);
    const after = await repo.findById(entry.id);
    expect(after?.isPinned).toBe(false);
  });
});
