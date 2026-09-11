import { CallingCleanupService } from './calling-cleanup.service';
import { CallRepository } from '../repositories/call.repository';
import { CallEventsService } from './call-events.service';
import { CallingNotificationPublisher } from './calling-notification-publisher.service';

describe('CallingCleanupService', () => {
  let service: CallingCleanupService;
  let callRepo: any;
  let callEvents: any;
  let notificationPublisher: any;

  beforeEach(() => {
    callRepo = {
      findStaleRingingCalls: jest.fn().mockResolvedValue([]),
      update: jest.fn(async (id: string, data: any) => ({ id, ...data })),
    };

    callEvents = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    notificationPublisher = {
      publishMissedCall: jest.fn().mockResolvedValue(undefined),
    };

    service = new CallingCleanupService(callRepo, callEvents, notificationPublisher);
  });

  it('does nothing when there are no stale calls', async () => {
    const result = await service.sweep();

    expect(result).toEqual([]);
    expect(callRepo.update).not.toHaveBeenCalled();
  });

  it('expires stale calls and ends them', async () => {
    const stale = [
      {
        id: 'call-1',
        scope: 'DM',
        scopeRef: 'dm1',
        type: 'VOICE',
        status: 'RINGING',
        creatorUserId: 'u1',
      },
    ];
    callRepo.findStaleRingingCalls.mockResolvedValue(stale);

    const result = await service.sweep();

    expect(callRepo.update).toHaveBeenCalledWith('call-1', {
      status: 'ENDED',
      endedAt: expect.any(Date),
    });
    expect(result).toHaveLength(1);
    expect(result[0].callId).toBe('call-1');
    expect(result[0].timedOut).toBe(true);
  });

  it('publishes a missed-call notification for DM scope', async () => {
    const stale = [
      {
        id: 'call-1',
        scope: 'DM',
        scopeRef: 'dm1',
        type: 'VIDEO',
        status: 'RINGING',
        creatorUserId: 'u1',
      },
    ];
    callRepo.findStaleRingingCalls.mockResolvedValue(stale);

    await service.sweep();

    expect(notificationPublisher.publishMissedCall).toHaveBeenCalledWith({
      recipientUserId: 'u1',
      initiatorUserId: 'u1',
      callId: 'call-1',
      scope: 'DM',
      callType: 'VIDEO',
      scopeRef: 'dm1',
    });
    expect(callEvents.publish).toHaveBeenCalledWith(
      'EXPIRED',
      expect.objectContaining({ id: 'call-1' }),
      'u1',
    );
  });

  it('does not notify for non-DM scopes', async () => {
    const stale = [
      {
        id: 'call-2',
        scope: 'SERVER_CHANNEL',
        scopeRef: 'channel-9',
        type: 'VOICE',
        status: 'RINGING',
        creatorUserId: 'u1',
      },
    ];
    callRepo.findStaleRingingCalls.mockResolvedValue(stale);

    await service.sweep();

    expect(notificationPublisher.publishMissedCall).not.toHaveBeenCalled();
    expect(callEvents.publish).toHaveBeenCalledTimes(1);
  });
});