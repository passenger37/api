import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsToRoleDto {
  @ApiProperty({
    example: 'clx123abc',
    description: 'Role ID',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: ['permission1', 'permission2', 'permission3'],
    description: 'Permission IDs',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({
    each: true,
  })
  permissionIds: string[];
}
