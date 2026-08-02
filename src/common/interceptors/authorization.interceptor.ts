import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable } from 'rxjs';

import { Reflector } from '@nestjs/core';

import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

import { AuthorizedRequest } from '../interfaces/authorized-request.interface';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthorizationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,

    private readonly authorizationService: AuthorizationService,
  ) {}

  async intercept(
    context: ExecutionContext,

    next: CallHandler,
  ): Promise<Observable<any>> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();

    if (!request.user) {
      return next.handle();
    }

    request.authorization =
      await this.authorizationService.getAuthorizationContext(request.user.id);

    return next.handle();
  }
}
