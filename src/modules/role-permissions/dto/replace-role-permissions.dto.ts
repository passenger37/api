import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ReplaceRolePermissionsDto {
  @ApiProperty({
    example: 'clx123abc',
    description: 'Role ID',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: ['permission1', 'permission2', 'permission3'],
    description:
      'Complete list of permission IDs that should remain assigned to the role.',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({
    each: true,
  })
  permissionIds: string[];
}
