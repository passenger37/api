import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'CONTENT_MODERATOR',
    description: 'Unique role name',
  })
  @IsString()
  @Length(2, 50)
  name: string;

  @ApiPropertyOptional({
    example: 'Can moderate posts and comments',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether this is a protected system role',
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean = false;
}
