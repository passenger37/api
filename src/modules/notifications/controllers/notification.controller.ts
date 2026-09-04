import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationCommandService } from '../services/notification-command.service';
import { NotificationQueryService } from '../services/notification-query.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationListQuery } from '../dto/query/notification-list.query';
import { NotificationPreferenceUpdateRequest } from '../dto/request/notification-preference.request';
import {
  serializeNotification,
  serializeNotificationPreference,
} from '../mappers/notification.mapper';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly commandService: NotificationCommandService,
    private readonly queryService: NotificationQueryService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationListQuery,
  ) {
    return this.queryService.list(userId, query.cursor, query.limit);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    const unreadCount = await this.queryService.unreadCount(userId);

    return { unreadCount };
  }

  @Get('preferences')
  async preferences(@CurrentUser('id') userId: string) {
    return this.preferenceService.listForUser(userId);
  }

  @Put('preferences')
  async updatePreference(
    @CurrentUser('id') userId: string,
    @Body() request: NotificationPreferenceUpdateRequest,
  ) {
    const preference = await this.preferenceService.update(userId, request);

    return serializeNotificationPreference(preference);
  }

  @Get(':notificationId')
  async get(
    @Param('notificationId') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.queryService.get(notificationId, userId);

    return serializeNotification(notification);
  }

  @Patch(':notificationId/read')
  async markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.commandService.markRead(
      notificationId,
      userId,
    );

    return serializeNotification(notification);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser('id') userId: string) {
    const affected = await this.commandService.markAllRead(userId);

    return { affected };
  }
}
