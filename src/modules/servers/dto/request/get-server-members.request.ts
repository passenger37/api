import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { Transform } from 'class-transformer';

export class GetServerMembersRequest {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
