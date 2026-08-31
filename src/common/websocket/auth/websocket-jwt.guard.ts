import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Socket } from 'socket.io';

import { WebSocketConnectionAuthService } from './websocket-connection-auth.service';

@Injectable()
export class WebSocketJwtGuard implements CanActivate {
  constructor(
    private readonly connectionAuth: WebSocketConnectionAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    const result = await this.connectionAuth.authenticate(client);

    if (!result) {
      throw new UnauthorizedException(
        'WebSocket authentication required. Please reconnect with a valid token.',
      );
    }

    return true;
  }
}
