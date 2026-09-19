import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore: boolean;
}
