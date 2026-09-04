import {
  Notification,
  NotificationDelivery,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

export type NotificationWithDeliveries = Notification & {
  deliveries: NotificationDelivery[];
};

export interface DomainNotificationEvent {
  eventId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  expiresInSeconds?: number;
}

export interface CreateNotificationOptions {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  expiresAt?: Date;
  channels?: NotificationDeliveryChannel[];
}

export interface UpdateNotificationPreferencesInput {
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
}

export { NotificationDeliveryChannel, NotificationDeliveryStatus };
