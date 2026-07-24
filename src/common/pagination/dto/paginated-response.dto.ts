export class PaginatedResponseDto<T> {
  items!: T[];

  total!: number;
}