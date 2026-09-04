import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { COMMUNITY_COMMENT_CONTENT_MAX_LENGTH } from '../../constants/community.constants';

export class UpdateCommentRequest {
  @ApiProperty({ maxLength: COMMUNITY_COMMENT_CONTENT_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(COMMUNITY_COMMENT_CONTENT_MAX_LENGTH)
  content: string;
}
