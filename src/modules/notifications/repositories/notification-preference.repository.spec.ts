import { NotificationType } from '@prisma/client';

import { NotificationPreferenceRepository } from './notification-preference.repository';

describe('NotificationPreferenceRepository', () => {
  let repository: NotificationPreferenceRepository;
  let prisma: {
    notificationPreference: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const row = {
    userId: 'u1',
    notificationType: NotificationType.SYSTEM,
    inAppEnabled: true,
    pushEnabled: true,
    emailEnabled: true,
  };

  beforeEach(() => {
    prisma = {
      notificationPreference: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repository = new NotificationPreferenceRepository(prisma as any);
  });

  it('should upsert a preference with defaults', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue(row);

    const created = await repository.upsert('u1', NotificationType.SYSTEM, {});

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: {
        userId_notificationType: {
          userId: 'u1',
          notificationType: NotificationType.SYSTEM,
        },
      },
      create: {
        userId: 'u1',
        notificationType: NotificationType.SYSTEM,
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
      },
      update: {
        inAppEnabled: undefined,
        pushEnabled: undefined,
        emailEnabled: undefined,
      },
    });
    expect(created).toEqual(row);
  });

  it('should upsert a preference preserving explicit flags', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({
      ...row,
      pushEnabled: false,
    });

    await repository.upsert('u1', NotificationType.SYSTEM, {
      pushEnabled: false,
    });

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          pushEnabled: false,
          inAppEnabled: true,
        }),
        update: expect.objectContaining({ pushEnabled: false }),
      }),
    );
  });

  it('should find a preference', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(row);

    const found = await repository.find('u1', NotificationType.SYSTEM);

    expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
      where: {
        userId_notificationType: {
          userId: 'u1',
          notificationType: NotificationType.SYSTEM,
        },
      },
    });
    expect(found).toEqual(row);
  });

  it('should find all preferences for a user ordered by type', async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([row]);

    const found = await repository.findManyByUser('u1');

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { notificationType: 'asc' },
    });
    expect(found).toHaveLength(1);
  });

  it('should find preferences for a set of types', async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([row]);

    const found = await repository.findByTypes('u1', [
      NotificationType.SYSTEM,
      NotificationType.SERVER_INVITE,
    ]);

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        notificationType: {
          in: [NotificationType.SYSTEM, NotificationType.SERVER_INVITE],
        },
      },
    });
    expect(found).toHaveLength(1);
  });
});
