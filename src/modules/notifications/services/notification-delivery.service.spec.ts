import {
  Notification,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

import { NotificationDeliveryService } from './notification-delivery.service';
import { NOTIFICATION_MAX_RETRY_ATTEMPTS } from '../constants/notification.constants';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let redis: any;
  let gateway: any;
  let deliveryRepository: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const notification: Notification = {
    id: 'n1',
    recipientUserId: 'u1',
    actorUserId: null,
    type: NotificationType.SYSTEM,
    entityType: NotificationEntityType.SERVER,
    entityId: 'srv1',
    payload: { message: 'hi' },
    readAt: null,
    createdAt: now,
    expiresAt: null,
    dedupeKey: null,
  };

  beforeEach(() => {
    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue('2'),
    };
    gateway = {
      broadcastNotification: jest.fn(),
    };
    deliveryRepository = {
      markDelivered: jest.fn().mockResolvedValue(undefined),
      findPending: jest.fn(),
      recordFailure: jest.fn(),
    };

    service = new NotificationDeliveryService(
      redis,
      gateway,
      deliveryRepository,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('handleNew', () => {
    it('should increment the unread counter, broadcast, and mark delivered', async () => {
      await service.handleNew(notification, 'd1');

      expect(redis.incr).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalled();
      expect(gateway.broadcastNotification).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'n1', type: NotificationType.SYSTEM }),
      );
      expect(deliveryRepository.markDelivered).toHaveBeenCalledWith('d1');
    });
  });

  describe('setUnreadCount', () => {
    it('should write the count to redis', async () => {
      await service.setUnreadCount('u1', 9);

      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return null when there is no cached value', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.getUnreadCount('u1')).resolves.toBeNull();
    });

    it('should parse the cached integer value', async () => {
      redis.get.mockResolvedValue('12');

      await expect(service.getUnreadCount('u1')).resolves.toBe(12);
    });

    it('should coerce a non-numeric cache value to zero', async () => {
      redis.get.mockResolvedValue('abc');

      await expect(service.getUnreadCount('u1')).resolves.toBe(0);
    });
  });

  describe('retryPending', () => {
    it('should skip when a retry is already in progress', async () => {
      (service as any).retrying = true;

      await service.retryPending();

      expect(deliveryRepository.findPending).not.toHaveBeenCalled();
    });

    it('should fan out pending deliveries and mark them delivered', async () => {
      const pending = [
        {
          id: 'd1',
          retryCount: 0,
          notification,
        },
      ];
      deliveryRepository.findPending.mockResolvedValue(pending);

      await service.retryPending();

      expect(gateway.broadcastNotification).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'n1' }),
      );
      expect(deliveryRepository.markDelivered).toHaveBeenCalledWith('d1');
      expect(deliveryRepository.recordFailure).not.toHaveBeenCalled();
    });

    it('should record a failure and respect the max retry attempts', async () => {
      gateway.broadcastNotification.mockImplementation(() => {
        throw new Error('disconnected');
      });
      const pending = [
        {
          id: 'd1',
          retryCount: NOTIFICATION_MAX_RETRY_ATTEMPTS - 1,
          notification,
        },
      ];
      deliveryRepository.findPending.mockResolvedValue(pending);

      await service.retryPending();

      expect(deliveryRepository.recordFailure).toHaveBeenCalledWith(
        'd1',
        'disconnected',
        NOTIFICATION_MAX_RETRY_ATTEMPTS,
        NOTIFICATION_MAX_RETRY_ATTEMPTS,
      );
      expect(deliveryRepository.markDelivered).not.toHaveBeenCalled();
    });
  });
});
