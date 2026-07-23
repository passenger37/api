import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException();
    }

    const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');

    if (!isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
