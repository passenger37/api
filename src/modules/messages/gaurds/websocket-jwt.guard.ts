import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { Socket } from 'socket.io';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../users/services/user-query.service';

@Injectable()
export class WebSocketJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userQueryService: UserQueryService,
  ) {}

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

      const user = await this.userQueryService.findById(userId);

      if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
        throw new UnauthorizedException('Account is not active.');
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
