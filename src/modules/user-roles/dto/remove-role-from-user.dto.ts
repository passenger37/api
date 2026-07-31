import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemoveRoleFromUserDto {
  @ApiProperty({
    description: 'Role ID',
    example: '6d6e5f08-08dd-4d0d-a58b-56d5f7e96b66',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
