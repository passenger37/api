import { IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class SearchUsersRequest extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
