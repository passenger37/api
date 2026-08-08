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
    private readonly validation: ChannelMessageValidationService,
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
