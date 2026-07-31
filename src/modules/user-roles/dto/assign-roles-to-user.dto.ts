import { ApiProperty } from '@nestjs/swagger';

import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'Role IDs',
    type: [String],
    example: [
      '6d6e5f08-08dd-4d0d-a58b-56d5f7e96b66',
      '74efed2c-96b4-48cf-8a65-92dfd44af9c2',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', {
    each: true,
  })
  roleIds: string[];
}
