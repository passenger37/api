import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityVisibility } from '@prisma/client';

import {
  COMMUNITY_DESCRIPTION_MAX_LENGTH,
  COMMUNITY_NAME_MAX_LENGTH,
} from '../../constants/community.constants';

export class CreateCommunityRequest {
  @ApiProperty({ description: 'Slug of the associated server.' })
  @IsString()
  serverId: string;

  @ApiPropertyOptional({ description: 'Server id used to authorise creation.' })
  @IsOptional()
  @IsUUID(4)
  ownerIdHint?: string;

  @ApiProperty({ maxLength: COMMUNITY_NAME_MAX_LENGTH })
  @IsString()
  @MaxLength(COMMUNITY_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    maxLength: COMMUNITY_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_DESCRIPTION_MAX_LENGTH)
  description?: string;

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
