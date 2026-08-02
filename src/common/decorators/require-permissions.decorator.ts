import { applyDecorators, UseGuards } from '@nestjs/common';

import { Permissions } from './permissions.decorator';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionVersionGuard } from '../guards/permission-version.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

export function RequirePermissions(...permissions: string[]) {
  return applyDecorators(
    Permissions(...permissions),

    UseGuards(JwtAuthGuard, PermissionVersionGuard, PermissionsGuard),
  );
}
