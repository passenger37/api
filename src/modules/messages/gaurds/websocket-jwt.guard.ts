import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class WebSocketJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException(
        'WebSocket authentication token is required.',
      );
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid WebSocket token.');
      }

      client.data.userId = payload.sub;
      client.data.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired WebSocket token.');
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string') {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;

    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      return authorization.substring(7);
    }

    return null;
  }
}
