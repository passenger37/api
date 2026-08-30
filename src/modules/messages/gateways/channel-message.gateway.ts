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
  UseGuards,
  Inject,
  forwardRef,
  UseFilters,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { WebSocketExceptionFilter } from '../../../common/filters/websocket-exception.filter';
import { redisKeys } from '../../../core/redis/redis-keys';
import { Server, Socket } from 'socket.io';
import { DeleteChannelMessageRequest } from '../dto/request/delete-channel-message.request';
import { ChannelMessageValidationService } from '../services/channel-message-validation.service';
import { ChannelMessageCommandService } from '../services/channel-message-command.service';
import { SendChannelMessageRequest } from '../dto/request/send-channel-message.request';
import { JoinChannelRequest } from '../dto/request/join-channel.request';
import { LeaveChannelRequest } from '../dto/request/leave-channel.request';
import { ChannelMessageQueryService } from '../services/channel-message-query.service';
import { WebSocketJwtGuard } from '../gaurds/websocket-jwt.guard';
import { EditChannelMessageRequest } from '../dto/request/edit-channel-message.request';
import { PinChannelMessageRequest } from '../dto/request/pin-channel-message.request';
import { UnpinChannelMessageRequest } from '../dto/request/unpin-channel-message.request';
import { ChannelMessageReactionCommandService } from '../services/channel-message-reaction-command.service';
import { AddMessageReactionRequest } from '../dto/request/add-message-reaction.request';
import { RemoveMessageReactionRequest } from '../dto/request/remove-message-reaction.request';
import { ChannelMessageReactionQueryService } from '../services/channel-message-reaction-query.service';
import { GetMessageReactionsRequest } from '../dto/request/get-message-reactions.request';
import { GetReactionCountsRequest } from '../dto/request/get-reaction-counts.request';
import { WebSocketRateLimitService } from '../../../common/websocket/rate-limit/websocket-rate-limit.service';
import { WebSocketValidationPipe } from '../../../common/websocket/pipes/websocket-validation.pipe';
import { WebSocketErrorNormalizer } from '../../../common/websocket/error/websocket-error.normalizer';
import {
  WEB_SOCKET_ALLOWED_ORIGINS,
  WS_MAX_BUFFER_BYTES,
} from '../../../common/websocket/websocket-origins';
import { WebSocketConnectionAuthService } from '../gaurds/websocket-connection-auth.service';
import { WebSocketConnectionLimitService } from '../gaurds/websocket-connection-limit.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { TypingStartRequest } from '../dto/request/typing-start.request';
import { TypingStopRequest } from '../dto/request/typing-stop.request';
import { MessageReadRequest } from '../dto/request/message-read.request';
import { TypingService } from '../services/typing.service';
import { SyncChannelRequest } from '../dto/request/sync-channel.request';

@WebSocketGateway({
  namespace: '/messages',

  cors: {
    origin: WEB_SOCKET_ALLOWED_ORIGINS,
  },

  maxHttpBufferSize: WS_MAX_BUFFER_BYTES,
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class ChannelMessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly rateLimit: WebSocketRateLimitService,
    private readonly messageQueryService: ChannelMessageQueryService,
    private readonly reactionCommandService: ChannelMessageReactionCommandService,
    private readonly validation: ChannelMessageValidationService,
    private readonly reactionQueryService: ChannelMessageReactionQueryService,
    private readonly queryService: ChannelMessageQueryService,
    @Inject(forwardRef(() => ChannelMessageCommandService))
    private readonly commandService: ChannelMessageCommandService,
    private readonly typingService: TypingService,
    private readonly memberQueryService: ServerMemberQueryService,
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

    console.log(
      `WebSocket connected: ${client.id} | user: ${client.data.userId}`,
    );
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      await this.connectionLimit.release(userId);
    }

    console.log(`WebSocket disconnected: ${client.id} | user: ${userId}`);
  }

  @SubscribeMessage('join-channel')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: JoinChannelRequest,
  ) {
    const userId = client.data.userId;
    const channelId = request.channelId;

    await this.validation.validateChannelAccess(channelId, userId);

    await client.join(channelId);

    return {
      success: true,
      channelId,
      userId,
    };
  }

  @SubscribeMessage('leave-channel')
  async leaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: LeaveChannelRequest,
  ) {
    const channelId = request.channelId;
    await client.leave(channelId);

    return {
      success: true,
      channelId,
      userId: client.data.userId,
    };
  }

  @SubscribeMessage('sync-channel')
  async syncChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: SyncChannelRequest,
  ) {
    const event = 'sync-channel';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('sync-channel', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const { channel } = await this.validation.validateChannelAccess(
        request.channelId,
        userId,
      );

      const anchor = await this.queryService.getMessageById(
        request.lastKnownMessageId,
      );

      if (anchor.channelId !== request.channelId) {
        throw new BadRequestException(
          'Last known message does not belong to this channel.',
        );
      }

      const messages = await this.queryService.getMessagesAfterInChannel(
        request.channelId,
        request.lastKnownMessageId,
      );

      const readState = await this.queryService.getChannelReadState(
        channel.serverId,
        request.channelId,
        userId,
      );

      return {
        success: true,
        event,
        channelId: request.channelId,
        sync: {
          anchorMessageId: request.lastKnownMessageId,
          messages,
          unreadCount: readState.unreadCount,
        },
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: SendChannelMessageRequest,
  ) {
    const event = 'send-message';
    try {
      const userId = client.data.userId;
      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('send-message', userId),
        limit: 20,
        windowSeconds: 10,
      });
      const result = await this.commandService.createMessage(
        request.channelId,
        userId,
        request.content,
        request.parentMessageId,
        request.clientMessageId,
      );

      return {
        success: true,
        event: 'send-message',
        deliveryState: 'created',
        data: result.message,
        deduplicated: result.deduplicated,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('edit-message')
  async editMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: EditChannelMessageRequest,
  ) {
    const event = 'edit-message';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('edit-message', userId),
        limit: 20,
        windowSeconds: 10,
      });

      await this.commandService.editMessage(
        request.messageId,
        userId,
        request.content,
        request.expectedVersion,
      );

      return {
        success: true,
        messageId: request.messageId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('delete-message')
  async deleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DeleteChannelMessageRequest,
  ) {
    const event = 'delete-message';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('delete-message', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.queryService.getMessage(request.messageId);

      await this.commandService.deleteMessage(
        request.messageId,
        message.serverId,
        userId,
      );

      this.server.to(message.channelId).emit('message-deleted', {
        messageId: request.messageId,
      });

      return {
        success: true,
        messageId: request.messageId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('pin-message')
  async pinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PinChannelMessageRequest,
  ) {
    const event = 'pin-message';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('pin-message', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.queryService.getMessage(request.messageId);

      const pinnedMessage = await this.commandService.pinMessage(
        request.messageId,
        message.serverId,
        userId,
      );

      this.broadcastMessagePinned(message.channelId, request.messageId);

      return {
        success: true,
        message: pinnedMessage,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('unpin-message')
  async unpinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: UnpinChannelMessageRequest,
  ) {
    const event = 'unpin-message';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('unpin-message', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.queryService.getMessage(request.messageId);

      const unpinnedMessage = await this.commandService.unpinMessage(
        request.messageId,
        message.serverId,
        userId,
      );

      this.broadcastMessageUnpinned(message.channelId, request.messageId);

      return {
        success: true,
        message: unpinnedMessage,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('add-reaction')
  async addReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: AddMessageReactionRequest,
  ) {
    const event = 'add-reaction';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('add-reaction', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.messageQueryService.getMessage(
        request.messageId,
      );

      const reaction = await this.reactionCommandService.addReaction(
        request.messageId,
        userId,
        request.emoji,
      );

      this.server.to(message.channelId).emit('reaction-added', reaction);

      return {
        success: true,
        reaction,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('remove-reaction')
  async removeReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: RemoveMessageReactionRequest,
  ) {
    const event = 'remove-reaction';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('remove-reaction', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.messageQueryService.getMessage(
        request.messageId,
      );

      const reaction = await this.reactionCommandService.removeReaction(
        request.messageId,
        userId,
        request.emoji,
      );

      this.server.to(message.channelId).emit('reaction-removed', reaction);

      return {
        success: true,
        reaction,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('get-message-reactions')
  async getMessageReactions(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetMessageReactionsRequest,
  ) {
    const event = 'get-message-reactions';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('get-message-reactions', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.messageQueryService.getMessage(
        request.messageId,
      );

      await this.validation.validateChannelAccess(message.channelId, userId);

      const reactions = await this.reactionQueryService.getMessageReactions(
        request.messageId,
      );

      return {
        success: true,
        messageId: request.messageId,
        reactions,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('get-reaction-counts')
  async getReactionCounts(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetReactionCountsRequest,
  ) {
    const event = 'get-reaction-counts';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('get-reaction-counts', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const message = await this.messageQueryService.getMessage(
        request.messageId,
      );

      await this.validation.validateChannelAccess(message.channelId, userId);

      const counts = await this.reactionQueryService.getReactionCounts(
        request.messageId,
      );

      return {
        success: true,
        messageId: request.messageId,
        counts,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('typing-start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: TypingStartRequest,
  ) {
    const event = 'typing-start';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('typing-start', userId),
        limit: 10,
        windowSeconds: 10,
      });

      const { channel } = await this.validation.validateChannelAccess(
        request.channelId,
        userId,
      );

      const member = await this.memberQueryService.getMemberWithUser(
        channel.serverId,
        userId,
      );

      await this.typingService.startTyping(request.channelId, userId);

      client.broadcast.to(request.channelId).emit('typing-started', {
        channelId: request.channelId,
        userId,
        username: member.nickname ?? member.user.username,
      });

      return {
        success: true,
        channelId: request.channelId,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('typing-stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: TypingStopRequest,
  ) {
    const event = 'typing-stop';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('typing-stop', userId),
        limit: 10,
        windowSeconds: 10,
      });

      await this.validation.validateChannelAccess(request.channelId, userId);

      await this.typingService.stopTyping(request.channelId, userId);

      client.broadcast.to(request.channelId).emit('typing-stopped', {
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

  @SubscribeMessage('message-read')
  async messageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: MessageReadRequest,
  ) {
    const event = 'message-read';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: redisKeys.wsRateLimit('message-read', userId),
        limit: 20,
        windowSeconds: 10,
      });

      const state = await this.commandService.markChannelRead(
        request.channelId,
        userId,
        request.lastReadMessageId,
      );

      this.server.to(request.channelId).emit('message-read', {
        channelId: state.channelId,
        userId,
        lastReadMessageId: state.lastReadMessageId,
        lastReadAt: state.lastReadAt,
      });

      return {
        success: true,
        ...state,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  broadcastMessageCreated(channelId: string, payload: unknown) {
    this.server.to(channelId).emit('message-created', payload);
  }

  broadcastMessageUpdated(channelId: string, payload: unknown) {
    this.server.to(channelId).emit('message-updated', payload);
  }

  broadcastMessageDeleted(channelId: string, messageId: string) {
    this.server.to(channelId).emit('message-deleted', {
      messageId,
    });
  }

  broadcastMessagePinned(channelId: string, messageId: string) {
    this.server.to(channelId).emit('message-pinned', {
      messageId,
    });
  }

  broadcastMessageUnpinned(channelId: string, messageId: string) {
    this.server.to(channelId).emit('message-unpinned', {
      messageId,
    });
  }

  broadcastReactionAdded(channelId: string, payload: unknown) {
    this.server.to(channelId).emit('reaction-added', payload);
  }

  broadcastReactionRemoved(channelId: string, payload: unknown) {
    this.server.to(channelId).emit('reaction-removed', payload);
  }

  private reject(client: Socket, statusCode: number, message: string) {
    client.emit('error', { statusCode, message });

    client.disconnect(true);
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}
