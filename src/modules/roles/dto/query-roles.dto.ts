import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import { BasePaginationQueryDto } from '../../../common/pagination';

export class QueryRolesDto extends BasePaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by role name',
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
  @IsIn([
    'name',
    'createdAt',
  ])
  sortBy?: 'name' | 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortOrder?: 'asc' | 'desc';
}