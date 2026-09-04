import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNITY_POST_CONTENT_MAX_LENGTH } from '../../constants/community.constants';

export class UpdatePostRequest {
  @ApiPropertyOptional({ description: 'Community category id.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: COMMUNITY_POST_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_POST_CONTENT_MAX_LENGTH)
  content?: string;
}
