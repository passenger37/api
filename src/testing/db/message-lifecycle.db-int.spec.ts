import { ChannelMessageRepository } from '../../modules/messages/repositories/channel-message.repository';
import { PrismaService } from '../../core/database/prisma.service';
import {
  createDbTestHarness,
  DbTestContext,
} from './db-test.harness';
import { seedDbFixture, DbFixture } from './db-test.fixtures';

describe('Database Integration: message lifecycle (40.87)', () => {
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

  it('walks a message through create → read → edit → pin → delete', async () => {
    // create
    const created = await repo.create({
      content: 'first draft',
      server: { connect: { id: fixture.serverId } },
      channel: { connect: { id: fixture.channelId } },
      author: { connect: { id: fixture.ownerMemberId } },
      messageSeq: 1,
    });

    // read
    const read = await repo.findById(created.id);
    expect(read?.content).toBe('first draft');
    expect(read?.version).toBe(1);

    // edit
    const edited = await repo.update(created.id, {
      content: 'revised draft',
      isEdited: true,
      editedAt: new Date(),
      version: { increment: 1 },
    });
    expect(edited.content).toBe('revised draft');
    expect(edited.isEdited).toBe(true);

    // pin
    const pinned = await repo.pin(created.id);
    expect(pinned.isPinned).toBe(true);

    // soft delete
    const deleted = await repo.softDelete(created.id);
    expect(deleted.isDeleted).toBe(true);

    // gone from normal channel queries but row still exists for audit
    const listed = await repo.findManyByChannel(fixture.channelId);
    expect(listed.some((m) => m.id === created.id)).toBe(false);
    const raw = await prisma.channelMessage.findUnique({ where: { id: created.id } });
    expect(raw?.isDeleted).toBe(true);
  });
});
