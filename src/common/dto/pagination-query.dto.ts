import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  /**
   * Prisma skip value.
   */
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  /**
   * Prisma take value.
   */
  get take(): number {
    return this.pageSize;
  }
}
