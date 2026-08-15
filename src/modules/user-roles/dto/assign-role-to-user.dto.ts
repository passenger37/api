import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleToUserDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'cmrop3lp40003ejs02hr02ea9',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
