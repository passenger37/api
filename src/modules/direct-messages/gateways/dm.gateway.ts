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
  BadRequestException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DirectMessageMode } from '@prisma/client';

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
import { E2eeDmCommandService } from '../services/e2ee-dm-command.service';
import { DmReactionCommandService } from '../services/dm-reaction-command.service';
import { DmOpenRequest } from '../dto/request/dm-open.request';
import { DmSendRequest } from '../dto/request/dm-send.request';
import { DmE2eeSendRequest } from '../dto/request/dm-e2ee-send.request';
import { DmE2eeEditRequest } from '../dto/request/dm-e2ee-edit.request';
import { DmE2eeDeleteRequest } from '../dto/request/dm-e2ee-delete.request';
import { DmE2eeReactionRequest } from '../dto/request/dm-e2ee-reaction.request';
import { DmE2eeReadRequest } from '../dto/request/dm-e2ee-read.request';
import { DmE2eeTypingStartRequest } from '../dto/request/dm-e2ee-typing-start.request';
import { DmE2eeTypingStopRequest } from '../dto/request/dm-e2ee-typing-stop.request';
import { DmE2eeDisappearingSettingsRequest } from '../dto/request/dm-e2ee-disappearing.request';
import { DmSyncRequest } from '../dto/request/dm-sync.request';
import { DmReadRequest } from '../dto/request/dm-read.request';
import { DmEditRequest } from '../dto/request/dm-edit.request';
import { DmDeleteRequest } from '../dto/request/dm-delete.request';
import { DmReactionWsRequest } from '../dto/request/dm-reaction-ws.request';
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
    private readonly e2eeCommandService: E2eeDmCommandService,
    @Inject(forwardRef(() => DmReactionCommandService))
    private readonly reactionCommandService: DmReactionCommandService,
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

      if (!request.channelId || !request.content) {
        throw new BadRequestException(
          'channelId and content are required and must be non-empty strings.',
        );
      }

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
        request.parentMessageId,
        request.attachmentIds,
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

  @SubscribeMessage('dm-e2ee-open')
  async openE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmOpenRequest,
  ) {
    const event = 'dm-e2ee-open';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-open', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const channel = await this.commandService.open(
        userId,
        request.targetUserId,
        DirectMessageMode.PRIVATE_E2EE,
      );

      await client.join(dmRoom(channel.id));

      return {
        success: true,
        event,
        channelId: channel.id,
        mode: channel.mode,
        partnerUserId:
          channel.userAId === userId ? channel.userBId : channel.userAId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-send')
  async sendE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeSendRequest,
  ) {
    const event = 'dm-e2ee-send';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-send', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.sendText(userId, request);

      return {
        success: true,
        event,
        deliveryState: 'created',
        message: result.message,
        envelopes: result.envelopes,
        deduplicated: result.deduplicated,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-edit')
  async editE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeEditRequest,
  ) {
    const event = 'dm-e2ee-edit';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-edit', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.editMessage(userId, request);

      return {
        success: true,
        event,
        message: result.message,
        envelopes: result.envelopes,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-delete')
  async deleteE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeDeleteRequest,
  ) {
    const event = 'dm-e2ee-delete';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-delete', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.deleteMessage(
        userId,
        request,
      );

      return {
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-reaction-add')
  async reactionAddE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeReactionRequest,
  ) {
    const event = 'dm-e2ee-reaction-add';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-reaction-add', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.addReaction(userId, request);

      return {
        success: true,
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-reaction-remove')
  async reactionRemoveE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeReactionRequest,
  ) {
    const event = 'dm-e2ee-reaction-remove';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-reaction-remove', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.removeReaction(
        userId,
        request,
      );

      return {
        success: true,
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-read')
  async readE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeReadRequest,
  ) {
    const event = 'dm-e2ee-read';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-read', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.markRead(userId, request);

      return {
        success: true,
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-typing-start')
  async typingStartE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeTypingStartRequest,
  ) {
    const event = 'dm-e2ee-typing-start';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-typing-start', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.startTyping(userId, request);

      return {
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-typing-stop')
  async typingStopE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeTypingStopRequest,
  ) {
    const event = 'dm-e2ee-typing-stop';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-typing-stop', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.stopTyping(userId, request);

      return {
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-e2ee-disappearing-settings')
  async setDisappearingSettingsE2ee(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmE2eeDisappearingSettingsRequest,
  ) {
    const event = 'dm-e2ee-disappearing-settings';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-e2ee-disappearing-settings', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const result = await this.e2eeCommandService.setDisappearingSettings(
        userId,
        request,
      );

      return {
        success: true,
        event,
        ...result,
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

      if (!request.channelId) {
        throw new BadRequestException('channelId is required.');
      }

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

  broadcastE2eeMessageCreated(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-e2ee-message-created', payload);
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

  broadcastReactionAdded(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-reaction-added', payload);
  }

  broadcastReactionRemoved(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-reaction-removed', payload);
  }

  broadcastE2eeTypingStart(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-e2ee-typing-started', payload);
  }

  broadcastE2eeTypingStop(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-e2ee-typing-stopped', payload);
  }

  broadcastE2eeMessageRead(channelId: string, payload: unknown) {
    this.server.to(dmRoom(channelId)).emit('dm-e2ee-message-read', payload);
  }

  broadcastE2eeMessageWithAttachment(channelId: string, payload: unknown) {
    this.server
      .to(dmRoom(channelId))
      .emit('dm-e2ee-message-with-attachment', payload);
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

      await this.commandService.assertNotBlockedForChannel(
        request.channelId,
        userId,
      );

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

      await this.commandService.assertNotBlockedForChannel(
        request.channelId,
        userId,
      );

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

  @SubscribeMessage('dm-edit')
  async edit(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmEditRequest,
  ) {
    const event = 'dm-edit';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-edit', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const message = await this.commandService.edit(
        request.messageId,
        userId,
        request.content,
        request.expectedVersion,
      );

      return {
        success: true,
        event,
        message,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-delete')
  async deleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmDeleteRequest,
  ) {
    const event = 'dm-delete';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-delete', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const result = await this.commandService.delete(
        request.messageId,
        userId,
      );

      return {
        success: result.success,
        event,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-reaction-add')
  async reactionAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmReactionWsRequest,
  ) {
    const event = 'dm-reaction-add';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-reaction-add', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const result = await this.reactionCommandService.addReaction(
        request.messageId!,
        userId,
        request.emoji,
      );

      return {
        success: true,
        event,
        ...result,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('dm-reaction-remove')
  async reactionRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DmReactionWsRequest,
  ) {
    const event = 'dm-reaction-remove';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('dm-reaction-remove', userId),
        limit: 30,
        windowSeconds: 10,
      });

      const result = await this.reactionCommandService.removeReaction(
        request.messageId!,
        userId,
        request.emoji,
      );

      return {
        success: true,
        event,
        ...result,
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
