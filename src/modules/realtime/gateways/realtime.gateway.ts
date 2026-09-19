import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { ForbiddenException } from '@nestjs/common';
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

import {
  REALTIME_PRESENCE_OFFLINE,
  REALTIME_PRESENCE_ONLINE,
  REALTIME_PRESENCE_UPDATE,
  REALTIME_ROOM,
  REALTIME_TYPING_START,
  REALTIME_TYPING_STOP,
  REALTIME_WS_RATE_LIMIT,
  REALTIME_WINDOW_SECONDS,
  realtimeChannelRoom,
  realtimePostRoom,
  realtimeUserRoom,
} from '../constants/realtime.constants';
import {
  RealtimeEventType,
  RealtimePresenceStatus,
  RealtimeUserPresence,
} from '../types/realtime.types';
import { RealtimeAccessService } from '../services/realtime-access.service';
import { RealtimePresenceService } from '../services/realtime-presence.service';
import { RealtimeTypingService } from '../services/realtime-typing.service';
import { RealtimeEventBridgeService } from '../services/realtime-event-bridge.service';
import { CommentAuthorizationService } from '../../comments/services/comment-authorization.service';
import {
  ChannelJoinRequest,
  ChannelLeaveRequest,
  GetPresenceRequest,
  PostJoinRequest,
  PostLeaveRequest,
  PresenceSubscribeRequest,
  PresenceUnsubscribeRequest,
  SetPresenceRequest,
  TypingStartRequest,
  TypingStopRequest,
} from '../dto/request/index';

@WebSocketGateway({
  namespace: '/realtime',

  cors: {
    origin: WEB_SOCKET_ALLOWED_ORIGINS,
  },

  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    private readonly presenceService: RealtimePresenceService,
    private readonly typingService: RealtimeTypingService,
    private readonly accessService: RealtimeAccessService,
    private readonly bridge: RealtimeEventBridgeService,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
    private readonly commentAuthorizationService: CommentAuthorizationService,
  ) {}

  onModuleInit() {
    this.bridge.registerHandler((event) => {
      this.forwardToLocalClients(event);
    });
  }

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

    const userId = authenticated.userId;
    const sessionId = client.id;

    await this.presenceService.attachSession(userId, sessionId);

    await client.join(realtimeUserRoom(userId));
    await client.join(REALTIME_ROOM);

    const presence = await this.presenceService.getVisibleStatus(userId);

    void this.publishOnline(presence, userId);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      return;
    }

    await this.connectionLimit.release(userId);
    await this.presenceService.detachSession(userId, client.id);

    const presence = await this.presenceService.getVisibleStatus(userId);

    void this.publishOffline(presence, userId);
  }

  @SubscribeMessage('heartbeat')
  async heartbeat(@ConnectedSocket() client: Socket) {
    const event = 'heartbeat';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('heartbeat', userId),
        limit: REALTIME_WS_RATE_LIMIT.HEARTBEAT,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      await this.presenceService.heartbeat(userId, client.id);

      const presence = await this.presenceService.getVisibleStatus(userId);

      return {
        success: true,
        event,
        presence,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('presence:set')
  async setPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: SetPresenceRequest,
  ) {
    const event = 'presence:set';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('presence-set', userId),
        limit: REALTIME_WS_RATE_LIMIT.SET_PRESENCE,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      const raw = await this.presenceService.setStatus(
        userId,
        request.status,
        request.privacy,
      );

      const visible = await this.presenceService.getVisibleStatus(userId);

      await this.publishUpdate(visible, userId);

      return {
        success: true,
        event,
        presence: raw,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('presence:get')
  async getPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetPresenceRequest,
  ) {
    const event = 'presence:get';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('presence-get', userId),
        limit: REALTIME_WS_RATE_LIMIT.GET_PRESENCE,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      const presence = await this.presenceService.getVisibleStatus(
        request.userId,
      );

      return {
        success: true,
        event,
        presence,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('presence:subscribe')
  async subscribePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PresenceSubscribeRequest,
  ) {
    const event = 'presence:subscribe';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('presence-subscribe', userId),
        limit: REALTIME_WS_RATE_LIMIT.PRESENCE_SUBSCRIBE,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      const canView = await this.presenceService.canViewerSeePresence(
        request.userId,
        userId,
      );

      if (!canView) {
        throw new ForbiddenException(
          "You do not have permission to view this user's presence.",
        );
      }

      await client.join(realtimeUserRoom(request.userId));

      const presence = await this.presenceService.getVisibleStatus(
        request.userId,
      );

      return {
        success: true,
        event,
        userId: request.userId,
        presence,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('presence:unsubscribe')
  async unsubscribePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PresenceUnsubscribeRequest,
  ) {
    const event = 'presence:unsubscribe';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('presence-unsubscribe', userId),
        limit: REALTIME_WS_RATE_LIMIT.PRESENCE_SUBSCRIBE,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      await client.leave(realtimeUserRoom(request.userId));

      return {
        success: true,
        event,
        userId: request.userId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('channel:join')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: ChannelJoinRequest,
  ) {
    const event = 'channel:join';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('channel-join', userId),
        limit: REALTIME_WS_RATE_LIMIT.CHANNEL_JOIN,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      await this.accessService.validateChannelAccess(request.channelId, userId);

      await client.join(realtimeChannelRoom(request.channelId));

      return {
        success: true,
        event,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('channel:leave')
  async leaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: ChannelLeaveRequest,
  ) {
    const event = 'channel:leave';
    try {
      const userId = client.data.userId;

      await client.leave(realtimeChannelRoom(request.channelId));

      return {
        success: true,
        event,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('post:join')
  async joinPost(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PostJoinRequest,
  ) {
    const event = 'post:join';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('post-join', userId),
        limit: REALTIME_WS_RATE_LIMIT.POST_JOIN,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      const postType = await this.commentAuthorizationService.resolvePostType(
        request.postId,
      );
      const postContext = await this.commentAuthorizationService.resolvePost(
        request.postId,
        postType,
      );
      await this.commentAuthorizationService.assertCanAccessPost(
        postContext,
        userId,
        false,
      );

      await client.join(realtimePostRoom(request.postId));

      return {
        success: true,
        event,
        postId: request.postId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('post:leave')
  async leavePost(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PostLeaveRequest,
  ) {
    const event = 'post:leave';
    try {
      const userId = client.data.userId;

      await client.leave(realtimePostRoom(request.postId));

      return {
        success: true,
        event,
        postId: request.postId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('typing:start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: TypingStartRequest,
  ) {
    const event = 'typing:start';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('typing-start', userId),
        limit: REALTIME_WS_RATE_LIMIT.TYPING,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      const access = await this.accessService.validateChannelAccess(
        request.channelId,
        userId,
      );

      await this.typingService.startTyping(request.channelId, userId);

      await this.bridge.publish({
        type: RealtimeEventType.TYPING_START,
        channelId: request.channelId,
        userId,
        username: access.username,
      });

      return {
        success: true,
        event,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('typing:stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: TypingStopRequest,
  ) {
    const event = 'typing:stop';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('typing-stop', userId),
        limit: REALTIME_WS_RATE_LIMIT.TYPING,
        windowSeconds: REALTIME_WINDOW_SECONDS,
      });

      await this.accessService.validateChannelAccess(request.channelId, userId);

      await this.typingService.stopTyping(request.channelId, userId);

      await this.bridge.publish({
        type: RealtimeEventType.TYPING_STOP,
        channelId: request.channelId,
        userId,
      });

      return {
        success: true,
        event,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  private forwardToLocalClients(event: {
    type: string;
    [key: string]: unknown;
  }): void {
    switch (event.type) {
      case RealtimeEventType.PRESENCE_ONLINE:
      case RealtimeEventType.PRESENCE_OFFLINE:
      case RealtimeEventType.PRESENCE_UPDATE: {
        const presence = event.presence as RealtimeUserPresence;

        this.server
          .to(realtimeUserRoom(presence.userId))
          .emit(event.type, { ...event });

        if (
          event.type !== RealtimeEventType.PRESENCE_UPDATE ||
          presence.status !== RealtimePresenceStatus.INVISIBLE
        ) {
          this.server.to(REALTIME_ROOM).emit(event.type, { ...event });
        }
        break;
      }
      case RealtimeEventType.TYPING_START:
      case RealtimeEventType.TYPING_STOP: {
        const channelId = event.channelId as string;

        this.server
          .to(realtimeChannelRoom(channelId))
          .emit(event.type, { ...event });
        break;
      }
      case RealtimeEventType.COMMENT_CREATED:
      case RealtimeEventType.COMMENT_UPDATED:
      case RealtimeEventType.COMMENT_DELETED:
      case RealtimeEventType.COMMENT_REACTION: {
        const postId = event.postId as string;

        this.server.to(realtimePostRoom(postId)).emit(event.type, { ...event });
        break;
      }
      default:
        break;
    }
  }

  private publishOnline(presence: RealtimeUserPresence, userId: string): void {
    void this.bridge.publish({
      type: RealtimeEventType.PRESENCE_ONLINE,
      presence: { ...presence, userId },
    });
  }

  private publishOffline(presence: RealtimeUserPresence, userId: string): void {
    void this.bridge.publish({
      type: RealtimeEventType.PRESENCE_OFFLINE,
      presence: { ...presence, userId },
    });
  }

  private publishUpdate(presence: RealtimeUserPresence, userId: string): void {
    void this.bridge.publish({
      type: RealtimeEventType.PRESENCE_UPDATE,
      presence: { ...presence, userId },
    });
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });

    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}
