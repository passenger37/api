import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UserStatus } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class QueryUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  verified?: boolean;
}
