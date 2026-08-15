import { ApiProperty } from '@nestjs/swagger';

import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'Role IDs',
    type: [String],
    example: ['cmrop3lp10002ejs0ku9r4ots', 'cmrop3los0000ejs0ivy37s1l'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({
    each: true,
  })
  roleIds: string[];
}
