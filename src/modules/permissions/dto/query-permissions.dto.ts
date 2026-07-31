import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

export class QueryPermissionsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    example: 'users',
    description: 'Search by permission name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'users',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    example: 'read',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter system permissions',
  })
  @IsOptional()
  @IsBooleanString()
  @Transform(({ value }) => value === 'true')
  isSystem?: boolean;
}