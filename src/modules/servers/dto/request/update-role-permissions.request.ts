import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

import { ServerPermission } from '@prisma/client';

export class UpdateRolePermissionsRequest {
  @IsArray()
  @ArrayUnique()
  @IsEnum(ServerPermission, {
    each: true,
  })
  permissions: ServerPermission[];
}
