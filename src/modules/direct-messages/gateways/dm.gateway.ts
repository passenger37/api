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

import { DmCommandService } from '../services/dm-command.service';
import { DmQueryService } from '../services/dm-query.service';
import { DmOpenRequest } from '../dto/request/dm-open.request';
import { DmSendRequest } from '../dto/request/dm-send.request';
import { DmSyncRequest } from '../dto/request/dm-sync.request';
import { DmReadRequest } from '../dto/request/dm-read.request';
import { DmTypingStartRequest } from '../dto/request/dm-typing-start.request';
import { DmTypingStopRequest } from '../dto/request/dm-typing-stop.request';
import { TypingService } from '../../messages/services/typing.service';

const dmRoom = (channelId: string): string => `dm:${channelId}`;

@WebSocketGateway({
  namespace: '/dm',

  cors: {
    origin: WEB_SOCKET_ALLOWED_ORIGINS,
  },

  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class DmGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    @Inject(forwardRef(() => DmCommandService))
    private readonly commandService: DmCommandService,
    private readonly queryService: DmQueryService,
    private readonly connectionAuth: WebSocketConnectionAuthService,
    private readonly connectionLimit: WebSocketConnectionLimitService,
    private readonly typingService: TypingService,
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
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      await this.connectionLimit.release(userId);
    }
  }

  @SubscribeMessage('dm-open')
  async open(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmOpenRequest,
  ) {
    const event = 'dm-open';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-open', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const channel = await this.commandService.open(
        userId,
        request.targetUserId,
      );

      await client.join(dmRoom(channel.id));

      return {
        success: true,
        event,
        channelId: channel.id,
        partnerUserId:
          channel.userAId === userId ? channel.userBId : channel.userAId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmSendRequest,
  ) {
    const event = 'dm-send';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-send', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.commandService.send(
        request.channelId,
        userId,
        request.content,
        request.clientMessageId,
      );

      return {
        success: true,
        event,
        deliveryState: 'created',
        data: result.message,
        deduplicated: result.deduplicated,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-sync')
  async sync(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmSyncRequest,
  ) {
    const event = 'dm-sync';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-sync', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const messages = request.lastKnownMessageId
        ? await this.queryService.getMessagesAfter(
            request.channelId,
            userId,
            request.lastKnownMessageId,
          )
        : await this.queryService.getHistory(request.channelId, userId);

      return {
        success: true,
        event,
        channelId: request.channelId,
        messages,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-read')
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmReadRequest,
  ) {
    const event = 'dm-read';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-read', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const state = await this.commandService.markRead(
        request.channelId,
        userId,
        request.lastReadMessageId,
      );

      return {
        success: true,
        event,
        ...state,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  broadcastMessageCreated(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-message-created', payload);
  }

  broadcastMessageUpdated(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-message-updated', payload);
  }

  broadcastMessageDeleted(channelId: string, messageId: string) {
    this.server.to(dmRoom(channelId)).emit('dm-message-deleted', {
      messageId,
    });
  }

  broadcastMessageRead(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-message-read', payload);
  }

  @SubscribeMessage('dm:typing-start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmTypingStartRequest,
  ) {
    const event = 'dm:typing-start';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm:typing-start', userId),
        limit: 10,
        windowSeconds: 10,
      });

      await this.queryService.getChannel(request.channelId, userId);

      await this.typingService.startTyping(request.channelId, userId);

      client.broadcast.to(dmRoom(request.channelId)).emit('dm-typing-started', {
        channelId: request.channelId,
        userId,
      });

      return {
        success: true,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm:typing-stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmTypingStopRequest,
  ) {
    const event = 'dm:typing-stop';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm:typing-stop', userId),
        limit: 10,
        windowSeconds: 10,
      });

      await this.queryService.getChannel(request.channelId, userId);

      await this.typingService.stopTyping(request.channelId, userId);

      client.broadcast.to(dmRoom(request.channelId)).emit('dm-typing-stopped', {
        channelId: request.channelId,
        userId,
      });

      return {
        success: true,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });

    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}
