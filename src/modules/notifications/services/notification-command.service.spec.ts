import {
  NotificationAccessDeniedException,
  NotificationNotFoundException,
} from '../exceptions/notification.exceptions';
import { NotificationCommandService } from './notification-command.service';
import {
  NotificationDeliveryChannel,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

describe('NotificationCommandService', () => {
  let service: NotificationCommandService;
  let prisma: any;
  let notificationRepository: any;
  let preferenceRepository: any;
  let deliveryRepository: any;
  let deliveryService: any;
  let gateway: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const baseOptions = {
    recipientUserId: 'u1',
    actorUserId: null,
    type: NotificationType.SYSTEM as NotificationType,
    entityType: NotificationEntityType.SERVER as NotificationEntityType,
    entityId: 'srv1',
    payload: {},
  };

  beforeEach(() => {
    prisma = { $transaction: jest.fn() };
    notificationRepository = {
      findByDedupeKey: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      countUnread: jest.fn(),
    };
    preferenceRepository = { find: jest.fn() };
    deliveryRepository = { create: jest.fn() };
    deliveryService = {
      handleNew: jest.fn(),
      setUnreadCount: jest.fn(),
    };
    gateway = {
      broadcastRead: jest.fn(),
      broadcastReadAll: jest.fn(),
    };

    service = new NotificationCommandService(
      prisma,
      notificationRepository,
      preferenceRepository,
      deliveryRepository,
      deliveryService,
      gateway,
    );
  });

  describe('create', () => {
    it('should deduplicate and skip creation when a matching dedupe key exists', async () => {
      const existing = { id: 'n1', recipientUserId: 'u1' };
      notificationRepository.findByDedupeKey.mockResolvedValue(existing);

      const result = await service.create({
        ...baseOptions,
        dedupeKey: 'event:e1',
      });

      expect(notificationRepository.findByDedupeKey).toHaveBeenCalledWith(
        'u1',
        'event:e1',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        notification: existing,
        deliveryId: '',
        deduplicated: true,
      });
    });

    it('should create the notification and an IN_APP delivery inside a transaction', async () => {
      const notification = {
        id: 'n1',
        recipientUserId: 'u1',
        type: NotificationType.SYSTEM,
        createdAt: now,
      };
      const delivery = {
        id: 'd1',
        channel: NotificationDeliveryChannel.IN_APP,
      };

      notificationRepository.findByDedupeKey.mockResolvedValue(null);
      notificationRepository.create.mockResolvedValue(notification);
      preferenceRepository.find.mockResolvedValue(null);
      deliveryRepository.create.mockResolvedValue(delivery);

      prisma.$transaction.mockImplementation(async (cb) => cb({}));

      const result = await service.create({ ...baseOptions, dedupeKey: 'k' });

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'u1',
          dedupeKey: 'k',
        }),
        expect.anything(),
      );
      expect(deliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationDeliveryChannel.IN_APP,
        }),
        expect.anything(),
      );
      expect(deliveryService.handleNew).toHaveBeenCalledWith(
        notification,
        'd1',
      );
      expect(result).toEqual({
        notification,
        deliveryId: 'd1',
        deduplicated: false,
      });
    });

    it('should skip delivery fanned out when there is no IN_APP delivery', async () => {
      const notification = {
        id: 'n1',
        recipientUserId: 'u1',
        type: NotificationType.SYSTEM,
        createdAt: now,
      };
      notificationRepository.findByDedupeKey.mockResolvedValue(null);
      notificationRepository.create.mockResolvedValue(notification);
      preferenceRepository.find.mockResolvedValue({
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
      });
      deliveryRepository.create.mockResolvedValue({
        channel: NotificationDeliveryChannel.PUSH,
      });

      prisma.$transaction.mockImplementation(async (cb) => cb({}));

      const result = await service.create({
        ...baseOptions,
        channels: [NotificationDeliveryChannel.PUSH],
      });

      expect(deliveryService.handleNew).not.toHaveBeenCalled();
      expect(result.deliveryId).toBe('');
    });
  });

  describe('markRead', () => {
    it('should throw when the notification does not exist', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(
        NotificationNotFoundException,
      );
    });

    it('should throw when the notification belongs to another user', async () => {
      notificationRepository.findById.mockResolvedValue({
        id: 'n1',
        recipientUserId: 'u2',
      });

      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(
        NotificationAccessDeniedException,
      );
    });

    it('should mark read, refresh the unread count, and broadcast', async () => {
      const existing = {
        id: 'n1',
        recipientUserId: 'u1',
        deliveries: [],
      };
      const updated = { ...existing, readAt: now };
      notificationRepository.findById.mockResolvedValue(existing);
      notificationRepository.markRead.mockResolvedValue(updated);
      notificationRepository.countUnread.mockResolvedValue(0);

      const result = await service.markRead('n1', 'u1');

      expect(notificationRepository.markRead).toHaveBeenCalledWith('n1', 'u1');
      expect(notificationRepository.countUnread).toHaveBeenCalledWith('u1');
      expect(deliveryService.setUnreadCount).toHaveBeenCalledWith('u1', 0);
      expect(gateway.broadcastRead).toHaveBeenCalledWith('u1', 'n1');
      expect(result).toEqual(updated);
    });

    it('should return the existing notification when markRead has no effect', async () => {
      const existing = {
        id: 'n1',
        recipientUserId: 'u1',
        deliveries: [],
      };
      notificationRepository.findById.mockResolvedValue(existing);
      notificationRepository.markRead.mockResolvedValue(null);

      const result = await service.markRead('n1', 'u1');

      expect(deliveryService.setUnreadCount).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('markAllRead', () => {
    it('should refresh the unread count and broadcast when items were affected', async () => {
      notificationRepository.markAllRead.mockResolvedValue(3);
      notificationRepository.countUnread.mockResolvedValue(2);

      const result = await service.markAllRead('u1');

      expect(notificationRepository.markAllRead).toHaveBeenCalledWith('u1');
      expect(deliveryService.setUnreadCount).toHaveBeenCalledWith('u1', 2);
      expect(gateway.broadcastReadAll).toHaveBeenCalledWith('u1');
      expect(result).toBe(3);
    });

    it('should do nothing when there was nothing to mark read', async () => {
      notificationRepository.markAllRead.mockResolvedValue(0);

      const result = await service.markAllRead('u1');

      expect(deliveryService.setUnreadCount).not.toHaveBeenCalled();
      expect(gateway.broadcastReadAll).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
