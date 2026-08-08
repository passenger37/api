import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { UseGuards, Inject, forwardRef } from '@nestjs/common';

import { Server, Socket } from 'socket.io';
import { DeleteChannelMessageRequest } from '../dto/request/delete-channel-message.request';
import { ChannelMessageValidationService } from '../services/channel-message-validation.service';
import { ChannelMessageCommandService } from '../services/channel-message-command.service';
import { SendChannelMessageRequest } from '../dto/request/send-channel-message.request';
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
@WebSocketGateway({
  namespace: '/messages',

  cors: {
    origin: '*',
  },
})
@UseGuards(WebSocketJwtGuard)
export class ChannelMessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messageQueryService: ChannelMessageQueryService,
    private readonly reactionCommandService: ChannelMessageReactionCommandService,
    private readonly validation: ChannelMessageValidationService,
    private readonly reactionQueryService: ChannelMessageReactionQueryService,
    private readonly queryService: ChannelMessageQueryService,
    @Inject(forwardRef(() => ChannelMessageCommandService))
    private readonly commandService: ChannelMessageCommandService,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.data.userId;

    console.log(`WebSocket connected: ${client.id} | user: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    console.log(`WebSocket disconnected: ${client.id} | user: ${userId}`);
  }

  @SubscribeMessage('join-channel')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    const userId = client.data.userId;

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
    @MessageBody() channelId: string,
  ) {
    await client.leave(channelId);

    return {
      success: true,
      channelId,
      userId: client.data.userId,
    };
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: SendChannelMessageRequest,
  ) {
    const userId = client.data.userId;

    await this.validation.validateChannelAccess(request.channelId, userId);

    const message = await this.commandService.createMessage(
      request.channelId,
      userId,
      request.content,
      request.parentMessageId,
    );

    this.broadcastMessageCreated(request.channelId, message);

    return {
      success: true,
      message,
    };
  }

  @SubscribeMessage('edit-message')
  async editMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: EditChannelMessageRequest,
  ) {
    const userId = client.data.userId;

    const message = await this.queryService.getMessage(request.messageId);

    const updatedMessage = await this.commandService.editMessage(
      request.messageId,
      message.serverId,
      userId,
      request.content,
    );

    this.broadcastMessageUpdated(message.channelId, updatedMessage);

    return {
      success: true,
      message: updatedMessage,
    };
  }

  @SubscribeMessage('delete-message')
  async deleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DeleteChannelMessageRequest,
  ) {
    const userId = client.data.userId;

    const message = await this.queryService.getMessage(request.messageId);

    await this.commandService.deleteMessage(
      request.messageId,
      message.serverId,
      userId,
    );

    this.broadcastMessageDeleted(message.channelId, request.messageId);

    return {
      success: true,
      messageId: request.messageId,
    };
  }

  @SubscribeMessage('pin-message')
  async pinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PinChannelMessageRequest,
  ) {
    const userId = client.data.userId;

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
  }

  @SubscribeMessage('unpin-message')
  async unpinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: UnpinChannelMessageRequest,
  ) {
    const userId = client.data.userId;

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
  }

  @SubscribeMessage('add-reaction')
  async addReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: AddMessageReactionRequest,
  ) {
    const userId = client.data.userId;

    const message = await this.queryService.getMessage(request.messageId);

    const reaction = await this.reactionCommandService.addReaction(
      request.messageId,
      message.serverId,
      userId,
      request.emoji,
    );

    this.server.to(message.channelId).emit('reaction-added', {
      messageId: request.messageId,
      reaction,
    });

    return {
      success: true,
      reaction,
    };
  }

  @SubscribeMessage('remove-reaction')
  async removeReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: RemoveMessageReactionRequest,
  ) {
    const userId = client.data.userId;

    const message = await this.queryService.getMessage(request.messageId);

    const reaction = await this.reactionCommandService.removeReaction(
      request.messageId,
      message.serverId,
      userId,
      request.emoji,
    );

    this.server.to(message.channelId).emit('reaction-removed', reaction);

    return {
      success: true,
      ...reaction,
    };
  }

  @SubscribeMessage('get-message-reactions')
  async getMessageReactions(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetMessageReactionsRequest,
  ) {
    const userId = client.data.userId;

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
  }

  @SubscribeMessage('get-reaction-counts')
  async getReactionCounts(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetReactionCountsRequest,
  ) {
    const userId = client.data.userId;

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
}
