import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UserStatus } from '@prisma/client';

export class QueryUsersDto extends PaginationQueryDto {
  search?: string;

  status?: UserStatus;

  verified?: boolean;
}
