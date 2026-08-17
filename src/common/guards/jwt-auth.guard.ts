import { ExecutionContext, Injectable } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators';

import { SessionsService } from '../../modules/sessions/services/sessions.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
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

    const sessionId = request.cookies?.nexus_session;

    if (sessionId) {
      const session = await this.sessionsService.findBySessionId(sessionId);

      if (session && !session.isRevoked && session.expiresAt > new Date()) {
        request.user = {
          id: session.user.id,
          sub: session.user.id,
          email: session.user.email,
          username: session.user.username,
        };

        return true;
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
