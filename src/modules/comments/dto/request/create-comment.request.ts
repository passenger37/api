import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

import { COMMENT_DEFAULTS } from '../../constants/comment.constants';

export class CreateCommentRequest {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_DEFAULTS.MAX_CONTENT_LENGTH)
  content!: string;
}

export class CreateReplyRequest {
  @ApiProperty({ description: 'Reply content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_DEFAULTS.MAX_CONTENT_LENGTH)
  content!: string;
}

export class EditCommentRequest {
  @ApiProperty({ description: 'Updated comment content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_DEFAULTS.MAX_CONTENT_LENGTH)
  content!: string;
}
