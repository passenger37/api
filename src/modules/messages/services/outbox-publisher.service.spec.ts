import {
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STATUSES,
} from '../repositories/outbox-event.repository';
import { OutboxPublisherService } from './outbox-publisher.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let outboxRepository: any;
  let gateway: any;

  beforeEach(() => {
    outboxRepository = {
      findPendingBatch: jest.fn(),
      markProcessed: jest.fn(),
      recordFailure: jest.fn(),
    };
    gateway = {
      broadcastMessageCreated: jest.fn(),
      broadcastMessageUpdated: jest.fn(),
    };
    service = new OutboxPublisherService(outboxRepository, gateway);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('should broadcast a message-created event and mark it processed', async () => {
    outboxRepository.findPendingBatch.mockResolvedValue([
      {
        id: 'evt-1',
        eventType: 'message-created',
        channelId: 'ch1',
        attempts: 0,
        payload: { id: 'msg-1', content: 'hello' },
      },
    ]);

    await service.poll();

    expect(gateway.broadcastMessageCreated).toHaveBeenCalledWith('ch1', {
      id: 'msg-1',
      content: 'hello',
    });
    expect(outboxRepository.markProcessed).toHaveBeenCalledWith(['evt-1']);
    expect(outboxRepository.recordFailure).not.toHaveBeenCalled();
  });

  it('should broadcast a message-updated event and mark it processed', async () => {
    outboxRepository.findPendingBatch.mockResolvedValue([
      {
        id: 'evt-2',
        eventType: 'message-updated',
        channelId: 'ch1',
        attempts: 0,
        payload: { messageId: 'msg-1', version: 2 },
      },
    ]);

    await service.poll();

    expect(gateway.broadcastMessageUpdated).toHaveBeenCalledWith('ch1', {
      messageId: 'msg-1',
      version: 2,
    });
    expect(outboxRepository.markProcessed).toHaveBeenCalledWith(['evt-2']);
  });

  it('should record a failure and retry later on a throwing broadcast', async () => {
    outboxRepository.findPendingBatch.mockResolvedValue([
      {
        id: 'evt-1',
        eventType: 'message-created',
        channelId: 'ch1',
        attempts: 2,
        payload: { id: 'msg-1' },
      },
    ]);
    gateway.broadcastMessageCreated.mockImplementation(() => {
      throw new Error('boom');
    });

    await service.poll();

    expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
    expect(outboxRepository.recordFailure).toHaveBeenCalledWith(
      'evt-1',
      'boom',
      3,
    );
  });

  it('should skip publishing while a previous poll is still running', async () => {
    let resolveBatch!: (value: unknown) => void;
    let rejectBatch!: (reason?: unknown) => void;
    outboxRepository.findPendingBatch.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolveBatch = resolve;
          rejectBatch = reject;
        }),
    );

    const first = service.poll();
    const second = service.poll();

    resolveBatch([
      {
        id: 'evt-1',
        eventType: 'message-created',
        channelId: 'ch1',
        attempts: 0,
        payload: { id: 'msg-1' },
      },
    ]);
    async function settle() {
      await Promise.allSettled([first, second]);
    }
    await settle();

    expect(gateway.broadcastMessageCreated).toHaveBeenCalledTimes(1);
    expect(outboxRepository.markProcessed).toHaveBeenCalledTimes(1);
    expect(rejectBatch).toBeDefined();
  });

  it('should fail the event permanently after exhausting attempts', async () => {
    expect(OUTBOX_STATUSES.FAILED).toBe('FAILED');
    expect(OUTBOX_MAX_ATTEMPTS).toBe(8);
  });

  it('should start an interval on module init', () => {
    jest.useFakeTimers();
    service.onModuleInit();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    jest.useRealTimers();
  });
});
