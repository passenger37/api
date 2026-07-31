import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryRolesDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['name', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sortBy?: 'name' | 'createdAt' = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
