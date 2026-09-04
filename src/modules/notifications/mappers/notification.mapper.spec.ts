import {
  Notification,
  NotificationDelivery,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

import {
  serializeNotification,
  serializeNotificationDelivery,
  serializeNotificationPreference,
} from './notification.mapper';

describe('notification mappers', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('should serialize a delivery', () => {
    const delivery: NotificationDelivery = {
      id: 'd1',
      notificationId: 'n1',
      channel: NotificationDeliveryChannel.IN_APP,
      status: NotificationDeliveryStatus.DELIVERED,
      deliveredAt: now,
      failedAt: null,
      lastError: null,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    expect(serializeNotificationDelivery(delivery)).toEqual({
      id: 'd1',
      channel: NotificationDeliveryChannel.IN_APP,
      status: NotificationDeliveryStatus.DELIVERED,
      deliveredAt: now.toISOString(),
      failedAt: null,
      retryCount: 0,
    });
  });

  it('should serialize a notification with its deliveries', () => {
    const notification: Notification = {
      id: 'n1',
      recipientUserId: 'u1',
      actorUserId: null,
      type: NotificationType.SYSTEM,
      entityType: NotificationEntityType.SERVER,
      entityId: 'srv1',
      payload: { message: 'hi' },
      readAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: now,
      expiresAt: null,
      dedupeKey: null,
    };
    const serialized = serializeNotification({
      ...notification,
      deliveries: [],
    });

    expect(serialized).toMatchObject({
      id: 'n1',
      recipientUserId: 'u1',
      actorUserId: null,
      type: NotificationType.SYSTEM,
      entityId: 'srv1',
      payload: { message: 'hi' },
      readAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
      createdAt: now.toISOString(),
      expiresAt: null,
      deliveries: [],
    });
  });

  it('should serialize a preference', () => {
    const preference = {
      userId: 'u1',
      notificationType: NotificationType.SYSTEM,
      inAppEnabled: true,
      pushEnabled: false,
      emailEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    expect(serializeNotificationPreference(preference as any)).toEqual({
      userId: 'u1',
      notificationType: NotificationType.SYSTEM,
      inAppEnabled: true,
      pushEnabled: false,
      emailEnabled: true,
    });
  });
});
