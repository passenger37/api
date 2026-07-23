import { IsUUID } from 'class-validator';

export class RemovePermissionDto {
  @IsUUID()
  roleId: string;

  @IsUUID()
  permissionId: string;
}
