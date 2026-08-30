import { Injectable } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { Socket } from 'socket.io';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../users/services/user-query.service';

@Injectable()
export class WebSocketConnectionAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userQueryService: UserQueryService,
  ) {}

  async authenticate(client: Socket): Promise<{ userId: string } | null> {
    const token = this.extractToken(client);

    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      const userId = payload.sub as string | undefined;

      if (!userId) {
        return null;
      }

      const user = await this.userQueryService.findById(userId);

      if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
        return null;
      }

      client.data.userId = userId;

      return { userId };
    } catch {
      return null;
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
