import { NotificationEntityType, NotificationType } from '@prisma/client';

import { NotificationRepository } from './notification.repository';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let prisma: {
    notification: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const row = {
    id: 'n1',
    recipientUserId: 'u1',
    actorUserId: null,
    type: NotificationType.SYSTEM,
    entityType: NotificationEntityType.SERVER,
    entityId: 'srv1',
    payload: {},
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: null,
    dedupeKey: null,
  };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    repository = new NotificationRepository(prisma as any);
  });

  it('should create a notification', async () => {
    prisma.notification.create.mockResolvedValue(row);
    const data = { recipientUserId: 'u1', type: NotificationType.SYSTEM };

    const created = await repository.create(data as any);

    expect(prisma.notification.create).toHaveBeenCalledWith({ data });
    expect(created).toEqual(row);
  });

  it('should find a notification by id with its deliveries', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      ...row,
      deliveries: [],
    });

    const found = await repository.findById('n1');

    expect(prisma.notification.findUnique).toHaveBeenCalledWith({
      where: { id: 'n1' },
      include: { deliveries: true },
    });
    expect(found).toMatchObject({ id: 'n1' });
  });

  it('should find a notification by its dedupe key', async () => {
    prisma.notification.findUnique.mockResolvedValue(row);

    const found = await repository.findByDedupeKey('u1', 'event:e1');

    expect(prisma.notification.findUnique).toHaveBeenCalledWith({
      where: {
        recipientUserId_dedupeKey: {
          recipientUserId: 'u1',
          dedupeKey: 'event:e1',
        },
      },
    });
    expect(found).toEqual(row);
  });

  it('should paginate notifications for a user', async () => {
    prisma.notification.findMany.mockResolvedValue([row]);

    const found = await repository.findPage('u1', 'cursor-1', 10);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { recipientUserId: 'u1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: { id: 'cursor-1' },
      skip: 1,
      take: 10,
      include: { deliveries: true },
    });
    expect(found).toHaveLength(1);
  });

  it('should count unread notifications', async () => {
    prisma.notification.count.mockResolvedValue(3);

    const count = await repository.countUnread('u1');

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { recipientUserId: 'u1', readAt: null },
    });
    expect(count).toBe(3);
  });

  it('should mark one notification read and return it', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue({
      ...row,
      deliveries: [],
    });

    const updated = await repository.markRead('n1', 'u1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n1', recipientUserId: 'u1', readAt: null },
        data: { readAt: expect.any(Date) },
      }),
    );
    expect(updated).toMatchObject({ id: 'n1' });
  });

  it('should return null when marking a missing notification read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const updated = await repository.markRead('n1', 'u1');

    expect(updated).toBeNull();
  });

  it('should mark all notifications read and return the affected count', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const count = await repository.markAllRead('u1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { recipientUserId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(count).toBe(5);
  });
});
