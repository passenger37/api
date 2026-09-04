import { Injectable } from '@nestjs/common';
import { NotificationPreference, NotificationType } from '@prisma/client';

import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { NotificationPreferenceUpdateRequest } from '../dto/request/notification-preference.request';
import { serializeNotificationPreference } from '../mappers/notification.mapper';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    private readonly preferenceRepository: NotificationPreferenceRepository,
  ) {}

  async listForUser(userId: string) {
    const preferences = await this.preferenceRepository.findManyByUser(userId);

    return preferences.map(serializeNotificationPreference);
  }

  async update(
    userId: string,
    request: NotificationPreferenceUpdateRequest,
  ): Promise<NotificationPreference> {
    return this.preferenceRepository.upsert(userId, request.notificationType, {
      inAppEnabled: request.inAppEnabled,
      pushEnabled: request.pushEnabled,
      emailEnabled: request.emailEnabled,
    });
  }

  async isInAppEnabled(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const preference = await this.preferenceRepository.find(userId, type);

    return preference?.inAppEnabled ?? true;
  }
}
