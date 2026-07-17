import {
  applyDecorators,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Permissions } from './permissions.decorator';

export function Authorize(
  ...permissions: string[]
) {
  return applyDecorators(
    UseGuards(
      JwtAuthGuard,
      PermissionsGuard,
    ),

    Permissions(...permissions),
  );
}