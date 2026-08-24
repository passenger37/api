import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { Socket } from 'socket.io';

@Injectable()
export class WebSocketJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException('WebSocket authentication required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      const userId = payload.sub;

      if (!userId) {
        throw new UnauthorizedException('Invalid authentication token.');
      }

      client.data.userId = userId;

      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string') {
      return authToken;
    }

    return undefined;
  }
}
