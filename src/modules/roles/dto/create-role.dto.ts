import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Admin',
    description: 'Unique role name',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'System administrator role',
    description: 'Optional role description',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
