import { applyDecorators, UseGuards } from '@nestjs/common';

import { Permissions } from './permissions.decorator';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionVersionGuard } from '../guards/permission-version.guard';

export function OwnerOrPermission(permission: string) {
  return applyDecorators(
    Permissions(permission),

    UseGuards(JwtAuthGuard, PermissionVersionGuard),
  );
}
