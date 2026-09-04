import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

export interface NotificationDeliveryResponse {
  id: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveredAt: string | null;
  failedAt: string | null;
  retryCount: number;
}

export interface NotificationResponse {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  deliveries: NotificationDeliveryResponse[];
}

export interface NotificationPreferencesResponse {
  userId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
}
