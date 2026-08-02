import { PaginationResponseDto } from 'src/common/dto/pagination-response.dto';

export class PaginationMapper {
  static toResponse<TSource, TResponse>(
    items: TSource[],
    total: number,
    page: number,
    pageSize: number,
    mapper: (item: TSource) => TResponse,
  ): PaginationResponseDto<TResponse> {
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map(mapper),

      total,

      page,

      pageSize,

      totalPages,

      hasNext: page < totalPages,

      hasPrevious: page > 1,
    };
  }
}
