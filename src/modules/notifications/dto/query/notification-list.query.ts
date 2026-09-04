import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { NOTIFICATION_MAX_PAGE_SIZE } from '../../constants/notification.constants';

export class NotificationListQuery {
  @ApiPropertyOptional({ description: 'Pagination cursor (notification id).' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size.', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NOTIFICATION_MAX_PAGE_SIZE)
  limit?: number;
}
