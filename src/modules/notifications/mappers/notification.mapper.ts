import { NotificationDelivery, NotificationPreference } from '@prisma/client';

import { NotificationWithDeliveries } from '../types/notification.types';
import {
  NotificationDeliveryResponse,
  NotificationPreferencesResponse,
  NotificationResponse,
} from '../responses';

export function serializeNotificationDelivery(
  delivery: NotificationDelivery,
): NotificationDeliveryResponse {
  return {
    id: delivery.id,
    channel: delivery.channel,
    status: delivery.status,
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    failedAt: delivery.failedAt?.toISOString() ?? null,
    retryCount: delivery.retryCount,
  };
}

export function serializeNotification(
  notification: NotificationWithDeliveries,
): NotificationResponse {
  return {
    id: notification.id,
    recipientUserId: notification.recipientUserId,
    actorUserId: notification.actorUserId ?? null,
    type: notification.type,
    entityType: notification.entityType,
    entityId: notification.entityId,
    payload: (notification.payload as Record<string, unknown>) ?? {},
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    expiresAt: notification.expiresAt?.toISOString() ?? null,
    deliveries: notification.deliveries.map(serializeNotificationDelivery),
  };
}

export function serializeNotificationPreference(
  preference: NotificationPreference,
): NotificationPreferencesResponse {
  return {
    userId: preference.userId,
    notificationType: preference.notificationType,
    inAppEnabled: preference.inAppEnabled,
    pushEnabled: preference.pushEnabled,
    emailEnabled: preference.emailEnabled,
  };
}
