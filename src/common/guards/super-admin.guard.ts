import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

import { SystemRole } from '../constants/system-role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException();
    }

    const isSuperAdmin = await this.authorizationService.hasRole(
      user.id,
      SystemRole.SUPER_ADMIN,
    );

    if (!isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
