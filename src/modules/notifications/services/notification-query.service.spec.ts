import {
  NotificationAccessDeniedException,
  NotificationNotFoundException,
} from '../exceptions/notification.exceptions';
import { NotificationQueryService } from './notification-query.service';
import {
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

describe('NotificationQueryService', () => {
  let service: NotificationQueryService;
  let notificationRepository: any;
  let deliveryService: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const notification = {
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
    deliveries: [
      {
        id: 'd1',
        channel: 'IN_APP',
        status: NotificationDeliveryStatus.DELIVERED,
        deliveredAt: now,
        failedAt: null,
        retryCount: 0,
      },
    ],
  };

  beforeEach(() => {
    notificationRepository = {
      findPage: jest.fn(),
      findById: jest.fn(),
      countUnread: jest.fn(),
    };
    deliveryService = {
      getUnreadCount: jest.fn(),
      setUnreadCount: jest.fn(),
    };

    service = new NotificationQueryService(
      notificationRepository,
      deliveryService,
    );
  });

  describe('list', () => {
    it('should clamp the page size and return a next cursor when the page is full', async () => {
      const items = [notification, { ...notification, id: 'n2' }];
      notificationRepository.findPage.mockResolvedValue(items);

      const result = await service.list('u1', undefined, 2);

      expect(deliveryService.getUnreadCount).not.toHaveBeenCalled();
      expect(notificationRepository.findPage).toHaveBeenCalledWith(
        'u1',
        undefined,
        2,
      );
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('n2');
    });

    it('should return no cursor when the page is not full', async () => {
      notificationRepository.findPage.mockResolvedValue([notification]);

      const result = await service.list('u1');

      expect(notificationRepository.findPage).toHaveBeenCalledWith(
        'u1',
        undefined,
        50,
      );
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('get', () => {
    it('should throw when the notification does not exist', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(service.get('n1', 'u1')).rejects.toBeInstanceOf(
        NotificationNotFoundException,
      );
    });

    it('should throw when the notification belongs to another user', async () => {
      notificationRepository.findById.mockResolvedValue({
        ...notification,
        recipientUserId: 'u2',
      });

      await expect(service.get('n1', 'u1')).rejects.toBeInstanceOf(
        NotificationAccessDeniedException,
      );
    });

    it('should return the notification for its owner', async () => {
      notificationRepository.findById.mockResolvedValue(notification);

      const result = await service.get('n1', 'u1');

      expect(result).toEqual(notification);
    });
  });

  describe('unreadCount', () => {
    it('should return the cached count when present', async () => {
      deliveryService.getUnreadCount.mockResolvedValue(7);

      const result = await service.unreadCount('u1');

      expect(notificationRepository.countUnread).not.toHaveBeenCalled();
      expect(result).toBe(7);
    });

    it('should fall back to the database and warm the cache when absent', async () => {
      deliveryService.getUnreadCount.mockResolvedValue(null);
      notificationRepository.countUnread.mockResolvedValue(5);

      const result = await service.unreadCount('u1');

      expect(deliveryService.setUnreadCount).toHaveBeenCalledWith('u1', 5);
      expect(result).toBe(5);
    });
  });
});
