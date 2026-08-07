import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/messages',
  cors: {
    origin: '*',
  },
})
export class ChannelMessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-channel')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    await client.join(channelId);

    return {
      success: true,
      channelId,
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
