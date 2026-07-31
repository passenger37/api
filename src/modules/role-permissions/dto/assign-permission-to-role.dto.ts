import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionToRoleDto {
  @ApiProperty({
    example: 'clx123abc',
    description: 'Role ID',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: 'clx456xyz',
    description: 'Permission ID',
  })
  @IsString()
  @IsNotEmpty()
  permissionId: string;
}
