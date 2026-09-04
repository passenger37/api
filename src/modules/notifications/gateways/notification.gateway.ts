import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  forwardRef,
  Inject,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WebSocketExceptionFilter } from '../../../common/filters/websocket-exception.filter';
import { redisKeys } from '../../../core/redis/redis-keys';
import { WebSocketJwtGuard } from '../../../common/websocket/auth/websocket-jwt.guard';
import { WebSocketConnectionAuthService } from '../../../common/websocket/auth/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../../../common/websocket/auth/websocket-connection-limit.service';
import { WebSocketRateLimitService } from '../../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketValidationPipe } from '../../../common/websocket/pipes/websocket-validation.pipe';
import { WebSocketErrorNormalizer } from '../../../common/websocket/error/websocket-error.normalizer';
import {
  WEB_SOCKET_ALLOWED_ORIGINS,
  WS_MAX_BUFFER_BYTES,
} from '../../../common/websocket/websocket-origins';

import { NotificationCommandService } from '../services/notification-command.service';
import { NotificationQueryService } from '../services/notification-query.service';
import { NotificationListQuery } from '../dto/query/notification-list.query';
import {
  NOTIFICATION_EVENT_COUNT,
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_READ,
  NOTIFICATION_EVENT_READ_ALL,
  NOTIFICATION_WS_RATE_LIMIT,
  NOTIFICATION_WINDOW_SECONDS,
} from '../constants/notification.constants';

const notificationRoom = (userId: string): string => `notification:${userId}`;

@WebSocketGateway({
  namespace: '/notifications',

  cors: {
    origin: WEB_SOCKET_ALLOWED_ORIGINS,
  },

  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    @Inject(forwardRef(() => NotificationCommandService))
    private readonly commandService: NotificationCommandService,
    @Inject(forwardRef(() => NotificationQueryService))
    private readonly queryService: NotificationQueryService,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
  ) {}

  async handleConnection(client: Socket) {
    const authenticated = await this.connectionAuth.authenticate(client);

    if (!authenticated) {
      this.reject(client, 401, 'WebSocket authentication required.');
      return;
    }

    const allowed = await this.connectionLimit.acquire(authenticated.userId);

    if (!allowed) {
      this.reject(client, 429, 'Too many connections. Try again later.');
      return;
    }

    client.data.userId = authenticated.userId;

    await client.join(notificationRoom(authenticated.userId));
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      await this.connectionLimit.release(userId);
    }
  }

  @SubscribeMessage('notification:list')
  async list(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: NotificationListQuery,
  ) {
    const event = 'list';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('notification-list', userId),
        limit: NOTIFICATION_WS_RATE_LIMIT.LIST,
        windowSeconds: NOTIFICATION_WINDOW_SECONDS,
      });

      const result = await this.queryService.list(
        userId,
        request.cursor,
        request.limit,
      );

      return {
        success: true,
        event,
        data: result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('notification:read')
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: { notificationId: string },
  ) {
    const event = 'read';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('notification-read', userId),
        limit: NOTIFICATION_WS_RATE_LIMIT.READ,
        windowSeconds: NOTIFICATION_WINDOW_SECONDS,
      });

      const notification = await this.commandService.markRead(
        request.notificationId,
        userId,
      );

      const count = await this.queryService.unreadCount(userId);

      this.broadcastCount(userId, count);

      return {
        success: true,
        event,
        notificationId: notification.id,
        unreadCount: count,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('notification:read-all')
  async readAll(@ConnectedSocket() client: Socket) {
    const event = 'read-all';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('notification-read-all', userId),
        limit: NOTIFICATION_WS_RATE_LIMIT.READ_ALL,
        windowSeconds: NOTIFICATION_WINDOW_SECONDS,
      });

      const affected = await this.commandService.markAllRead(userId);

      const count = await this.queryService.unreadCount(userId);

      this.broadcastCount(userId, count);

      return {
        success: true,
        event,
        affected,
        unreadCount: count,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('notification:count')
  async count(@ConnectedSocket() client: Socket) {
    const event = 'count';
    try {
      const userId = client.data.userId;

      const count = await this.queryService.unreadCount(userId);

      return {
        success: true,
        event,
        unreadCount: count,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  broadcastNotification(userId: string, payload: unknown) {
    this.server
      .to(notificationRoom(userId))
      .emit(NOTIFICATION_EVENT_NEW, payload);
  }

  broadcastCount(userId: string, unreadCount: number) {
    this.server
      .to(notificationRoom(userId))
      .emit(NOTIFICATION_EVENT_COUNT, { unreadCount });
  }

  broadcastRead(userId: string, notificationId: string) {
    this.server.to(notificationRoom(userId)).emit(NOTIFICATION_EVENT_READ, {
      notificationId,
    });
  }

  broadcastReadAll(userId: string) {
    this.server.to(notificationRoom(userId)).emit(NOTIFICATION_EVENT_READ_ALL);
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });

    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}
