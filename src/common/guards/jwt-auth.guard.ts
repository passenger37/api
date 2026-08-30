import { ExecutionContext, Injectable } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AuthGuard } from '@nestjs/passport';

import { ConfigService } from '@nestjs/config';

import { IS_PUBLIC_KEY } from '../decorators';

import { SessionsService } from '../../modules/sessions/services/sessions.service';

import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const cookieName =
      this.configService.get<string>('session.cookie.name') ?? 'nexus_session';

    const sessionId = request.cookies?.[cookieName];

    if (sessionId) {
      const session = await this.sessionsService.findBySessionId(sessionId);

      if (
        session &&
        !session.isRevoked &&
        session.expiresAt > new Date() &&
        session.user.status === UserStatus.ACTIVE &&
        !session.user.deletedAt
      ) {
        request.user = {
          id: session.user.id,
          sub: session.user.id,
          email: session.user.email,
          username: session.user.username,
          permissionVersion: session.user.permissionVersion,
        };

        return true;
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
