import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { ServerPermission } from '@prisma/client';

export class UpsertChannelPermissionOverwriteRequest {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsEnum(ServerPermission)
  permission: ServerPermission;

  @IsBoolean()
  allow: boolean;

  @IsBoolean()
  deny: boolean;
}
