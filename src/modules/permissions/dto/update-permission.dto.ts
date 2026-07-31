import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @ApiPropertyOptional({
    example: 'users.read',
    description: 'Unique permission name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'users',
    description: 'Permission resource',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  resource?: string;

  @ApiPropertyOptional({
    example: 'read',
    description: 'Permission action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  action?: string;

  @ApiPropertyOptional({
    example: 'Allows reading users.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
