import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

export class PaginationMapper {
  static toResponse<TEntity, TResponse>(
    result: PaginatedResult<TEntity>,
    mapper: (entity: TEntity) => TResponse,
  ): PaginatedResponseDto<TResponse> {
    return {
      items: result.items.map(mapper),
      total: result.total,
    };
  }
}
