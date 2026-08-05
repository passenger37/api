import { SetMetadata } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';

export const SERVER_PERMISSION_KEY = 'server_permission';

export const RequireServerPermission = (permission: ServerPermission) =>
  SetMetadata(SERVER_PERMISSION_KEY, permission);
