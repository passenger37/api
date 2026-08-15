import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { ServerPermission } from '@prisma/client';

export class UpsertChannelPermissionOverwriteRequest {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsEnum(ServerPermission)
  permission: ServerPermission;

  @IsBoolean()
  allow: boolean;

  @IsBoolean()
  deny: boolean;
}
