import { BadRequestException } from '@nestjs/common';

export class NotificationNotFoundException extends BadRequestException {
  constructor() {
    super('Notification not found.');
  }
}

export class NotificationAccessDeniedException extends BadRequestException {
  constructor() {
    super('You do not have access to this notification.');
  }
}

export class NotificationPreferenceNotFoundException extends BadRequestException {
  constructor() {
    super('Notification preference not found.');
  }
}
