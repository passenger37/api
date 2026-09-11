import { DirectMessageChannelSettingsRepository } from './direct-message-channel-settings.repository';

describe('DirectMessageChannelSettingsRepository', () => {
  let repository: DirectMessageChannelSettingsRepository;
  let prisma: {
    directMessageChannelSettings: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      directMessageChannelSettings: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new DirectMessageChannelSettingsRepository(prisma as any);
  });

  it('should find settings by channel and user', async () => {
    prisma.directMessageChannelSettings.findUnique.mockResolvedValue({
      id: 's1',
      channelId: 'dm1',
      userId: 'userA',
    });

    const settings = await repository.find('dm1', 'userA');

    expect(prisma.directMessageChannelSettings.findUnique).toHaveBeenCalledWith(
      {
        where: {
          channelId_userId: { channelId: 'dm1', userId: 'userA' },
        },
      },
    );
    expect(settings).toEqual({
      id: 's1',
      channelId: 'dm1',
      userId: 'userA',
    });
  });

  it('should upsert with timestamps when flags turn on', async () => {
    prisma.directMessageChannelSettings.upsert.mockResolvedValue({
      id: 's1',
    });

    await repository.upsert('dm1', 'userA', {
      isMuted: true,
      isPinned: true,
    });

    expect(prisma.directMessageChannelSettings.upsert).toHaveBeenCalledWith({
      where: {
        channelId_userId: { channelId: 'dm1', userId: 'userA' },
      },
      create: expect.objectContaining({
        channel: { connect: { id: 'dm1' } },
        user: { connect: { id: 'userA' } },
        isMuted: true,
        isPinned: true,
        mutedAt: expect.any(Date),
        pinnedAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        isMuted: true,
        isPinned: true,
        mutedAt: expect.any(Date),
        pinnedAt: expect.any(Date),
      }),
    });
  });

  it('should clear timestamps when flags turn off', async () => {
    await repository.upsert('dm1', 'userA', {
      isArchived: false,
    });

    const update = prisma.directMessageChannelSettings.upsert.mock.calls[0][0]
      .update as Record<string, unknown>;

    expect(update.isArchived).toBe(false);
    expect(update.archivedAt).toBeNull();
  });

  it('should batch settings for one user across channels', async () => {
    prisma.directMessageChannelSettings.findMany.mockResolvedValue([
      { id: 's1', channelId: 'dm1' },
    ]);

    const rows = await repository.findForUser('userA', ['dm1', 'dm2']);

    expect(prisma.directMessageChannelSettings.findMany).toHaveBeenCalledWith({
      where: { userId: 'userA', channelId: { in: ['dm1', 'dm2'] } },
    });
    expect(rows).toHaveLength(1);
  });
});
