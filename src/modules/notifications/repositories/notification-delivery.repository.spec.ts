import { NotificationDeliveryStatus } from '@prisma/client';

import { NotificationDeliveryRepository } from './notification-delivery.repository';

describe('NotificationDeliveryRepository', () => {
  let repository: NotificationDeliveryRepository;
  let prisma: {
    notificationDelivery: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      notificationDelivery: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new NotificationDeliveryRepository(prisma as any);
  });

  it('should create a delivery', async () => {
    const row = { id: 'd1', channel: 'IN_APP' };
    prisma.notificationDelivery.create.mockResolvedValue(row);
    const data = {
      channel: 'IN_APP',
      notification: { connect: { id: 'n1' } },
    };

    const created = await repository.create(data as any);

    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith({ data });
    expect(created).toEqual(row);
  });

  it('should find pending deliveries with their notifications', async () => {
    const row = { id: 'd1', notification: { id: 'n1' } };
    prisma.notificationDelivery.findMany.mockResolvedValue([row]);

    const pending = await repository.findPending(100);

    expect(prisma.notificationDelivery.findMany).toHaveBeenCalledWith({
      where: { status: NotificationDeliveryStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { notification: true },
    });
    expect(pending).toEqual([row]);
  });

  it('should mark a delivery delivered', async () => {
    await repository.markDelivered('d1');

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: {
        status: NotificationDeliveryStatus.DELIVERED,
        deliveredAt: expect.any(Date),
        failedAt: null,
        lastError: null,
      },
    });
  });

  it('should record a failure as FAILED at the max attempts', async () => {
    await repository.recordFailure('d1', 'boom', 3, 3);

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd1' },
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.FAILED,
          lastError: 'boom',
          retryCount: 3,
        }),
      }),
    );
  });

  it('should record a failure as PENDING below the max attempts', async () => {
    await repository.recordFailure('d1', 'boom', 1, 3);

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.PENDING,
          retryCount: 1,
        }),
      }),
    );
  });
});
