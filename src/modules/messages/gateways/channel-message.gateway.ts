import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { UseGuards } from '@nestjs/common';

import { Server, Socket } from 'socket.io';

import { WebSocketJwtGuard } from '../gaurds/websocket-jwt.guard';
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

    @MessageBody()
    channelId: string,
  ) {
    await client.join(channelId);

    return {
      success: true,

      channelId,

      userId: client.data.userId,
    };
  }

  @SubscribeMessage('leave-channel')
  async leaveChannel(
    @ConnectedSocket() client: Socket,

    @MessageBody()
    channelId: string,
  ) {
    await client.leave(channelId);

    return {
      success: true,

      channelId,

      userId: client.data.userId,
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
