import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

@Injectable()
export class PermissionVersionGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const authorizationContext =
      await this.authorizationService.getAuthorizationContext(user.id);

    if (authorizationContext.permissionVersion !== user.permissionVersion) {
      throw new UnauthorizedException(
        'Your permissions have changed. Please login again.',
      );
    }

    return true;
  }
}
