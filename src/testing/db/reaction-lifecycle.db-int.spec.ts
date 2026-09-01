import { ChannelMessageReactionRepository } from '../../modules/messages/repositories/channel-message-reaction.repository';
import { PrismaService } from '../../core/database/prisma.service';
import {
  createDbTestHarness,
  DbTestContext,
} from './db-test.harness';
import { createChannelMessage, seedDbFixture, DbFixture } from './db-test.fixtures';

describe('Database Integration: reaction lifecycle (40.87)', () => {
  let ctx: DbTestContext;
  let prisma: PrismaService;
  let repo: ChannelMessageReactionRepository;
  let fixture: DbFixture;
  let messageId: string;

  beforeAll(async () => {
    ctx = await createDbTestHarness();
    prisma = ctx.prisma;
    repo = new ChannelMessageReactionRepository(prisma);
    fixture = await seedDbFixture(prisma);
    const msg = await createChannelMessage(
      prisma,
      fixture,
      fixture.ownerMemberId,
      'react on me',
      1,
    );
    messageId = msg.id;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('adds a reaction and reads it back', async () => {
    const reaction = await repo.addReaction(messageId, fixture.ownerMemberId, '❤️');
    expect(reaction.messageId).toBe(messageId);

    const found = await repo.findReaction(messageId, fixture.ownerMemberId, '❤️');
    expect(found?.id).toBe(reaction.id);
  });

  it('lists all reactions for a message with member attribution', async () => {
    await repo.addReaction(messageId, fixture.ownerMemberId, '👍');
    await repo.addReaction(messageId, fixture.memberMemberId, '👍');

    const reactions = await repo.getMessageReactions(messageId);
    expect(reactions.length).toBeGreaterThanOrEqual(2);

    const thumbsUp = reactions.filter((r) => r.emoji === '👍');
    expect(new Set(thumbsUp.map((r) => r.memberId))).toEqual(
      new Set([fixture.ownerMemberId, fixture.memberMemberId]),
    );
  });

  it('removes a reaction made by a specific member only', async () => {
    await repo.addReaction(messageId, fixture.ownerMemberId, '🎉');
    await repo.addReaction(messageId, fixture.memberMemberId, '🎉');

    await repo.removeReaction(messageId, fixture.ownerMemberId, '🎉');

    const remaining = await repo.findByMessage(messageId);
    const confetti = remaining.filter((r) => r.emoji === '🎉');
    expect(confetti).toHaveLength(1);
    expect(confetti[0].memberId).toBe(fixture.memberMemberId);
  });

  it('groups reaction counts by message and emoji in a single query', async () => {
    const m2 = await createChannelMessage(prisma, fixture, fixture.ownerMemberId, 'count target', 2);

    await repo.addReaction(messageId, fixture.ownerMemberId, '🔥');
    await repo.addReaction(messageId, fixture.memberMemberId, '🔥');
    await repo.addReaction(m2.id, fixture.ownerMemberId, '🔥');
    await repo.addReaction(m2.id, fixture.ownerMemberId, '🚀');

    const counts = await repo.countReactionsByMessages([messageId, m2.id]);

    expect(counts.get(messageId)?.get('🔥')).toBe(2);
    expect(counts.get(m2.id)?.get('🔥')).toBe(1);
    expect(counts.get(m2.id)?.get('🚀')).toBe(1);
    expect(counts.get(m2.id)?.get('❤️')).toBeUndefined();
  });
});
