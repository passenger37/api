export class PaginationResponseDto<T> {
  items!: T[];

  page!: number;

  pageSize!: number;

  total!: number;

  hasNext!: boolean;

  hasPrevious!: boolean;

  totalPages!: number;
}
