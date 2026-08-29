import {
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STATUSES,
  OutboxEventRepository,
} from './outbox-event.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('OutboxEventRepository', () => {
  let repository: OutboxEventRepository;
  let prisma: {
    outboxEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      outboxEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new OutboxEventRepository(prisma as any);
  });

  it('should create a pending outbox event', async () => {
    prisma.outboxEvent.create.mockResolvedValue({ id: 'evt-1' });

    await repository.create({
      eventType: 'message-created',
      channelId: 'ch1',
      payload: { id: 'msg-1' },
    });

    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'message-created',
        channelId: 'ch1',
        payload: { id: 'msg-1' },
      },
    });
  });

  it('should query pending events in insertion order', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([]);

    await repository.findPendingBatch();

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith({
      where: { status: OUTBOX_STATUSES.PENDING },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  });

  it('should mark events as processed', async () => {
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 2 });

    await repository.markProcessed(['evt-1', 'evt-2']);

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['evt-1', 'evt-2'] } },
      data: {
        status: OUTBOX_STATUSES.PROCESSED,
        processedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('should record a failure and stay pending until the attempt cap', async () => {
    prisma.outboxEvent.update.mockResolvedValue({ id: 'evt-1' });

    await repository.recordFailure('evt-1', 'boom', OUTBOX_MAX_ATTEMPTS - 1);

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: {
        attempts: OUTBOX_MAX_ATTEMPTS - 1,
        lastError: 'boom',
        status: OUTBOX_STATUSES.PENDING,
      },
    });
  });

  it('should fail permanently once the attempt cap is reached', async () => {
    prisma.outboxEvent.update.mockResolvedValue({ id: 'evt-1' });

    await repository.recordFailure('evt-1', 'boom', OUTBOX_MAX_ATTEMPTS);

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: {
        attempts: OUTBOX_MAX_ATTEMPTS,
        lastError: 'boom',
        status: OUTBOX_STATUSES.FAILED,
      },
    });
  });
});
