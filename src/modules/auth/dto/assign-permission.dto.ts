import { IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @IsUUID()
  roleId: string;

  @IsUUID()
  permissionId: string;
}
