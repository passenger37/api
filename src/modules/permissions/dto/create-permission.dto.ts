import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'users.read',
    description: 'Unique permission name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'users',
    description: 'Permission resource',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resource: string;

  @ApiProperty({
    example: 'read',
    description: 'Allowed action',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action: string;

  @ApiPropertyOptional({
    example: 'Allows reading users.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
