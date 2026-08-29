import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { UseGuards, UseFilters, UsePipes } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WebSocketJwtGuard } from '../gaurds/websocket-jwt.guard';
import { WebSocketExceptionFilter } from '../../../common/filters/websocket-exception.filter';
import { WebSocketValidationPipe } from '../../../common/websocket/pipes/websocket-validation.pipe';
import { WebSocketErrorNormalizer } from '../../../common/websocket/error/websocket-error.normalizer';
import { WebSocketRateLimitService } from '../../../common/websocket/rate-limit/websocket-rate-limit.service';
import {
  PresenceService,
  PresenceStatus,
  PRESENCE_ROOM,
} from '../services/presence.service';
import { SetPresenceRequest } from '../dto/request/set-presence.request';
import { GetPresenceRequest } from '../dto/request/get-presence.request';

@WebSocketGateway({
  namespace: '/presence',

  cors: {
    origin: '*',
  },
})
@UseGuards(WebSocketJwtGuard)
@UsePipes(new WebSocketValidationPipe())
@UseFilters(WebSocketExceptionFilter)
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly errorNormalizer: WebSocketErrorNormalizer,
    private readonly presenceService: PresenceService,
    private readonly rateLimit: WebSocketRateLimitService,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.data.userId;

    client.join(PRESENCE_ROOM);

    void this.broadcastOnline(client, userId);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    void this.broadcastOffline(client, userId);
  }

  @SubscribeMessage('set-presence')
  async setPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: SetPresenceRequest,
  ) {
    const event = 'set-presence';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: `ws:set-presence:${userId}`,
        limit: 10,
        windowSeconds: 10,
      });

      const presence = await this.presenceService.setStatus(
        userId,
        request.status,
      );

      if (request.status !== PresenceStatus.INVISIBLE) {
        client.broadcast.to(PRESENCE_ROOM).emit('presence-change', {
          userId,
          status: presence.status,
          lastSeen: presence.lastSeen,
        });
      }

      return {
        success: true,
        presence,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  @SubscribeMessage('get-presence')
  async getPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: GetPresenceRequest,
  ) {
    const event = 'get-presence';
    try {
      const userId = client.data.userId;

      await this.rateLimit.consume({
        key: `ws:get-presence:${userId}`,
        limit: 20,
        windowSeconds: 10,
      });

      const presence = await this.presenceService.getVisibleStatus(
        request.userId,
      );

      return {
        success: true,
        presence,
      };
    } catch (exception) {
      return this.normalizeError(exception, event);
    }
  }

  private async broadcastOnline(client: Socket, userId: string) {
    try {
      const presence = await this.presenceService.markOnline(userId);

      client.broadcast.to(PRESENCE_ROOM).emit('presence-change', {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
      });
    } catch (error) {
      console.error('Presence online broadcast failed', error);
    }
  }

  private async broadcastOffline(client: Socket, userId: string) {
    try {
      const presence = await this.presenceService.markOffline(userId);

      client.broadcast.to(PRESENCE_ROOM).emit('presence-change', {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
      });
    } catch (error) {
      console.error('Presence offline broadcast failed', error);
    }
  }

  private normalizeError(exception: unknown, event: string) {
    return this.errorNormalizer.normalize(exception, event);
  }
}
