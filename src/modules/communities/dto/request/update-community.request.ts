import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityVisibility } from '@prisma/client';

import {
  COMMUNITY_DESCRIPTION_MAX_LENGTH,
  COMMUNITY_NAME_MAX_LENGTH,
} from '../../constants/community.constants';

export class UpdateCommunityRequest {
  @ApiPropertyOptional({ maxLength: COMMUNITY_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: COMMUNITY_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ enum: CommunityVisibility })
  @IsOptional()
  @IsEnum(CommunityVisibility)
  visibility?: CommunityVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  discoveryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Community rules as JSON.' })
  @IsOptional()
  rules?: Record<string, unknown>;
}
