import { applyDecorators, UseGuards } from '@nestjs/common';

import { Roles } from './roles.decorator';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionVersionGuard } from '../guards/permission-version.guard';
import { RolesGuard } from '../guards/roles.guard';

import { SystemRole } from '../constants/system-role.enum';

export function RequireRoles(...roles: SystemRole[]) {
  return applyDecorators(
    Roles(...roles),

    UseGuards(JwtAuthGuard, PermissionVersionGuard, RolesGuard),
  );
}
